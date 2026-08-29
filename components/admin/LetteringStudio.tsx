"use client";

import {
  AlignCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceAround,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalSpaceAround,
  Download,
  GripVertical,
  Layers,
  MoreHorizontal,
  Move,
  Redo2,
  Undo2,
  RotateCw,
  Smile,
  Trash2,
  Type,
  Upload,
  X,
} from "lucide-react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useRef, useState } from "react";
import { snap, type Guia } from "@/lib/letteringSnap";
import {
  molaParada,
  passoDaMola,
  projetar,
  velocidade,
  type Amostra,
  type Mola,
} from "@/lib/letteringMotion";
import {
  desfazer,
  despachar,
  encerrarGesto,
  historyOf,
  podeDesfazer,
  podeRefazer,
  refazer,
  type Action,
  type History,
} from "@/lib/letteringState";
import {
  fontesFaltando,
  guardarRascunho,
  lerRascunho,
} from "@/lib/letteringStorage";
import { Button } from "@/components/ui/button";
import {
  angle,
  clamp,
  distance,
  hitsLayer,
  layerCorners,
  shortestTurn,
  topmostAt,
  unionBounds,
  alignedPosition,
  boundsOf,
  distributedValues,
  type AlignMode,
  type Layer,
  type Point,
  type Rect,
  type Size,
} from "@/lib/lettering";
import { drawLayer, measureLayer, safeScale, STAGE } from "@/lib/letteringDraw";

const SYSTEM_FONTS = [
  { family: '"BootzyTM"', label: "Bootzy" },
  { family: "Georgia, serif", label: "Georgia" },
  { family: "Helvetica, Arial, sans-serif", label: "Helvetica" },
  { family: "'Times New Roman', serif", label: "Times" },
  { family: "'Courier New', monospace", label: "Courier" },
  { family: "Impact, sans-serif", label: "Impact" },
];

/** Fonte de emoji do sistema: o canvas desenha colorido, sem asset nenhum. */
const EMOJI_FAMILY =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

const EMOJI_RAPIDOS = ["✨", "🔥", "❤️", "⭐", "👉", "😂", "🎉", "📍"];

const INPUT =
  "w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-base text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none";

const LABEL = "block text-sm font-medium text-neutral-700";

/** Xadrez de fundo: é assim que se enxerga que o PNG saiu mesmo transparente. */
/** Pulso curto onde o aparelho oferecer. No iPhone o Safari ignora, sem erro. */
function vibrar(ms: number) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // aparelho sem vibração
  }
}

const CHECKERBOARD =
  "repeating-conic-gradient(#e5e5e5 0% 25%, #ffffff 0% 50%) 50% / 16px 16px";

type Aba = "conteudo" | "estilo" | "efeitos";

let contador = 0;
function novaCamada(over: Partial<Layer> = {}): Layer {
  contador += 1;
  return {
    id: `camada-${contador}-${Date.now()}`,
    kind: "text",
    text: "Seu lettering aqui",
    family: SYSTEM_FONTS[0].family,
    size: 120,
    color: "#111111",
    align: "center",
    lineHeight: 1.1,
    tracking: 0,
    stroke: 0,
    strokeColor: "#ffffff",
    shadow: false,
    shadowBlur: 12,
    shadowX: 0,
    shadowY: 8,
    shadowColor: "#000000",
    box: false,
    boxColor: "#ffffff",
    boxPadding: 40,
    boxRadius: 24,
    x: STAGE.width / 2,
    y: STAGE.height / 2,
    rotation: 0,
    ...over,
  };
}

export function LetteringStudio() {
  // O rascunho é lido na primeira renderização: começar vazio e preencher
  // depois faria a peça piscar na tela a cada abertura.
  const [history, setHistory] = useState<History>(() => {
    const primeira = novaCamada();
    return historyOf(
      lerRascunho() ?? { layers: [primeira], selectedId: primeira.id },
    );
  });
  const { layers, selectedId } = history.presente;

  const despacharAcao = useCallback(
    (action: Action) => setHistory((h) => despachar(h, action)),
    [],
  );
  const fecharPasso = useCallback(
    () => setHistory((h) => encerrarGesto(h)),
    [],
  );
  const setSelectedId = useCallback(
    (id: string | null) => setHistory((h) => despachar(h, { type: "selecionar", id })),
    [],
  );
  const [fonts, setFonts] = useState(SYSTEM_FONTS);
  const [fontError, setFontError] = useState<string | null>(null);
  const [trim, setTrim] = useState(true);
  const [aba, setAba] = useState<Aba>("conteudo");
  /** null = menu fechado. Um painel de cada vez, que é o que cabe no celular. */
  const [painel, setPainel] = useState<"camadas" | "alinhar" | null>(null);
  const [aviso, setAviso] = useState<{ texto: string } | null>(null);
  const [sizes, setSizes] = useState<Map<string, Size>>(new Map());
  /** PNG só existe depois de pedir: gerar em 3x a cada toque trava o celular. */
  const [png, setPng] = useState<string | null>(null);

  const stageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  /** Dedos em cima do palco, por pointerId. */
  const pointersRef = useRef<Map<number, Point>>(new Map());
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const pinchRef = useRef<{
    id: string;
    distancia: number;
    angulo: number;
    size: number;
    rotation: number;
  } | null>(null);
  /** Mesma conta da pinça, mas com um dedo só, puxando a alça do canto. */
  const alcaRef = useRef<{
    id: string;
    distancia: number;
    angulo: number;
    size: number;
    rotation: number;
  } | null>(null);

  /**
   * O que o gesto está mudando neste instante, fora do React.
   *
   * Enquanto o dedo está na tela o desenho lê daqui e pinta em
   * requestAnimationFrame. Mandar cada movimento pro estado reconciliava a
   * árvore inteira — painel, lista, abas — sessenta vezes por segundo só pra
   * mover um número. O estado recebe o resultado quando o gesto acaba.
   */
  const vivoRef = useRef<Partial<Layer> & { id: string } | null>(null);
  const guiasRef = useRef<Guia[]>([]);
  const quadroRef = useRef<number | null>(null);
  const medidasRef = useRef<Map<string, Size>>(new Map());
  const camadasRef = useRef<Layer[]>(layers);
  const selecaoRef = useRef<string | null>(selectedId);
  /** Posições recentes do dedo, pra saber a velocidade na hora de soltar. */
  const amostrasRef = useRef<{ x: Amostra[]; y: Amostra[] }>({ x: [], y: [] });
  const animacaoRef = useRef<number | null>(null);
  const medirRef = useRef<HTMLCanvasElement | null>(null);



  const selected = layers.find((l) => l.id === selectedId) ?? null;

  const sensors = useSensors(
    // Sem a distância mínima, o toque que escolhe a camada viraria arraste.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // O desenho roda fora do React e precisa enxergar o estado atual sem ser
  // recriado a cada render — por isso o espelho em refs.
  useEffect(() => {
    camadasRef.current = layers;
    selecaoRef.current = selectedId;
  });

  /** A camada como ela está agora, já com o que o gesto está mexendo. */
  const comGesto = useCallback((layer: Layer): Layer => {
    const vivo = vivoRef.current;
    return vivo && vivo.id === layer.id ? { ...layer, ...vivo } : layer;
  }, []);

  /** Desenha o palco: as camadas, a moldura da escolhida e as guias do imã. */
  const pintar = useCallback(() => {
    quadroRef.current = null;
    const canvas = stageCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const escala = canvas.width / STAGE.width;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(escala, escala);

    camadasRef.current.forEach((base) => {
      const layer = comGesto(base);
      ctx.save();
      ctx.translate(layer.x, layer.y);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      drawLayer(ctx, layer);
      ctx.restore();
    });

    // Moldura e guias vivem no canvas do palco, que não é o canvas da
    // exportação — não há como elas vazarem pro PNG.
    const escolhida = camadasRef.current.find((l) => l.id === selecaoRef.current);
    const medida = escolhida ? medidasRef.current.get(escolhida.id) : null;
    if (escolhida && medida) {
      const layer = comGesto(escolhida);
      ctx.save();
      ctx.translate(layer.x, layer.y);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.strokeStyle = "rgba(23, 23, 23, .7)";
      ctx.lineWidth = 2 / escala;
      ctx.setLineDash([6 / escala, 5 / escala]);
      ctx.strokeRect(
        -medida.width / 2,
        -medida.height / 2,
        medida.width,
        medida.height,
      );
      ctx.restore();
    }

    if (guiasRef.current.length > 0) {
      ctx.save();
      ctx.strokeStyle = "#D4187C";
      ctx.lineWidth = 1.5 / escala;
      ctx.setLineDash([]);
      guiasRef.current.forEach((guia) => {
        ctx.beginPath();
        if (guia.eixo === "x") {
          ctx.moveTo(guia.pos, 0);
          ctx.lineTo(guia.pos, STAGE.height);
        } else {
          ctx.moveTo(0, guia.pos);
          ctx.lineTo(STAGE.width, guia.pos);
        }
        ctx.stroke();
      });
      ctx.restore();
    }
  }, [comGesto]);

  const agendarPintura = useCallback(() => {
    if (quadroRef.current !== null) return;
    quadroRef.current = requestAnimationFrame(pintar);
  }, [pintar]);

  /**
   * Mede as camadas e redesenha. A medição é síncrona quando as fontes já
   * estão prontas: esperar uma promessa a cada mudança punha o desenho um
   * passo atrás do dedo mesmo quando não havia fonte nova pra carregar.
   */
  useEffect(() => {
    const canvas = stageCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const medirTudo = () => {
      const medidas = new Map<string, Size>();
      layers.forEach((layer) => medidas.set(layer.id, measureLayer(ctx, layer)));
      medidasRef.current = medidas;
      setSizes(medidas);
      pintar();
    };

    const usadas = [...new Set(layers.map((l) => `${l.size}px ${l.family}`))];
    const faltaCarregar = usadas.filter((f) => {
      try {
        return !document.fonts.check(f);
      } catch {
        // Família que o navegador recusa: tratar como pronta e usar a reserva.
        return false;
      }
    });

    if (faltaCarregar.length === 0) {
      medirTudo();
      return;
    }

    let cancelado = false;
    Promise.all(
      faltaCarregar.map((f) => document.fonts.load(f).catch(() => null)),
    ).then(() => {
      if (!cancelado) medirTudo();
    });
    return () => {
      cancelado = true;
    };
  }, [layers, pintar]);

  /** Redesenha quando muda só a escolha, sem passar pela medição. */
  useEffect(() => {
    pintar();
  }, [selectedId, pintar]);

  /** Guarda o rascunho a cada mudança: fechar a aba não pode custar o layout. */
  useEffect(() => {
    guardarRascunho(history.presente);
  }, [history.presente]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 6000);
    return () => clearTimeout(t);
  }, [aviso]);

  /** Atalhos de teclado no computador. No celular valem os botões do palco. */
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      const alvo = e.target as HTMLElement | null;
      // Dentro de um campo, desfazer é do texto que está sendo digitado.
      if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return;
      e.preventDefault();
      setHistory((h) => (e.shiftKey ? refazer(h) : desfazer(h)));
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  const patch = useCallback(
    (over: Partial<Layer>, coalesce?: string) => {
      if (!selectedId) return;
      despacharAcao({ type: "alterar", id: selectedId, patch: over, coalesce });
    },
    [selectedId, despacharAcao],
  );

  /**
   * O toque acertou o desenho, e não só a caixa?
   *
   * Desenha a camada num canvas de um pixel só, posicionado exatamente onde o
   * dedo encostou, e olha se saiu tinta ali. Sem isso, tocar num canto vazio
   * de um texto girado selecionava a peça e travava o acesso ao que está
   * atrás dela.
   */
  const acertaODesenho = useCallback((layer: Layer, ponto: Point) => {
    try {
      const canvas = (medirRef.current ??= document.createElement("canvas"));
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return true;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, 1, 1);
      ctx.translate(0.5 - ponto.x, 0.5 - ponto.y);
      ctx.translate(layer.x, layer.y);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      drawLayer(ctx, layer);

      return ctx.getImageData(0, 0, 1, 1).data[3] > 0;
    } catch {
      // Sem leitura de pixel, a caixa volta a ser a resposta.
      return true;
    }
  }, []);

  /**
   * Qual camada o toque escolhe. O desenho tem prioridade; se o dedo não
   * encostou em tinta nenhuma, a caixa ainda vale — é o que salva a camada
   * fina demais pra acertar no dedo.
   */
  const camadaNoPonto = useCallback(
    (ponto: Point) => {
      for (let i = camadasRef.current.length - 1; i >= 0; i--) {
        const l = camadasRef.current[i];
        const size = medidasRef.current.get(l.id);
        if (!size || !hitsLayer(ponto, l, size)) continue;
        if (acertaODesenho(l, ponto)) return l;
      }
      return topmostAt(ponto, camadasRef.current, medidasRef.current);
    },
    [acertaODesenho],
  );

  /** Caixas das outras camadas, que é contra elas que o imã procura encaixe. */
  const outrasCaixas = useCallback((id: string) => {
    const fora: Rect[] = [];
    camadasRef.current.forEach((l) => {
      if (l.id === id) return;
      const size = medidasRef.current.get(l.id);
      if (size) fora.push(boundsOf(l, size));
    });
    return fora;
  }, []);

  /**
   * Aplica o imã e guarda as guias do encaixe. A tolerância acompanha o
   * tamanho do palco, não a tela: em telas diferentes o imã precisa pegar no
   * mesmo lugar do desenho.
   */
  const comImã = useCallback(
    (id: string, x: number, y: number) => {
      const size = medidasRef.current.get(id);
      if (!size) {
        guiasRef.current = [];
        return { x, y };
      }
      const r = snap({ x, y }, size, outrasCaixas(id), STAGE, STAGE.width * 0.012);
      const grudouAgora =
        r.guias.length > guiasRef.current.length && r.guias.length > 0;
      guiasRef.current = r.guias;
      // Um toque curto no encaixe: confirma sem exigir que o olho verifique.
      if (grudouAgora) vibrar(8);
      return { x: r.x, y: r.y };
    },
    [outrasCaixas],
  );

  /** Grava o resultado do gesto no histórico, como um passo só. */
  const encerrarComCommit = useCallback(() => {
    const vivo = vivoRef.current;
    guiasRef.current = [];
    if (!vivo) {
      agendarPintura();
      return;
    }
    const { id, ...patch } = vivo;
    vivoRef.current = null;
    despacharAcao({ type: "alterar", id, patch });
    fecharPasso();
    agendarPintura();
  }, [despacharAcao, fecharPasso, agendarPintura]);

  /**
   * Solta a camada continuando o movimento que o dedo deu: projeta onde ela
   * pararia, deixa o imã escolher o encaixe perto dali e assenta com mola,
   * herdando a velocidade — sem isso aparece uma emenda entre arrastar e
   * animar.
   */
  const soltarComInercia = useCallback(
    (id: string) => {
      const vivo = vivoRef.current;
      if (!vivo || vivo.x === undefined || vivo.y === undefined) {
        encerrarComCommit();
        return;
      }

      const vx = velocidade(amostrasRef.current.x);
      const vy = velocidade(amostrasRef.current.y);

      // O destino fica dentro do palco: sem esse limite um arremesso mandava a
      // peça pra fora da tela, onde não há como tocar nela de novo.
      const destino = {
        x: clamp(vivo.x + projetar(vx), 0, STAGE.width),
        y: clamp(vivo.y + projetar(vy), 0, STAGE.height),
      };
      const alvo = comImã(id, destino.x, destino.y);

      // Aba escondida não pinta quadro nenhum, e a mola nunca terminaria: o
      // gesto ficaria pendente até a pessoa voltar pro app. Aqui ela vai
      // direto pro destino e o passo é gravado.
      if (document.hidden) {
        vivoRef.current = { id, x: alvo.x, y: alvo.y };
        encerrarComCommit();
        return;
      }

      let molaX: Mola = { valor: vivo.x, velocidade: vx };
      let molaY: Mola = { valor: vivo.y, velocidade: vy };
      let anterior: number | null = null;

      const passo = (agora: number) => {
        const dt = anterior === null ? 1 / 60 : (agora - anterior) / 1000;
        anterior = agora;
        // Eixos independentes: uma mola só na distância desandaria quando x e y
        // saem com velocidades diferentes.
        molaX = passoDaMola(molaX, alvo.x, dt);
        molaY = passoDaMola(molaY, alvo.y, dt);
        vivoRef.current = { id, x: molaX.valor, y: molaY.valor };
        pintar();

        if (molaParada(molaX, alvo.x) && molaParada(molaY, alvo.y)) {
          animacaoRef.current = null;
          vivoRef.current = { id, x: alvo.x, y: alvo.y };
          encerrarComCommit();
          return;
        }
        animacaoRef.current = requestAnimationFrame(passo);
      };

      animacaoRef.current = requestAnimationFrame(passo);
    },
    [comImã, encerrarComCommit, pintar],
  );

  /**
   * Rede de segurança pros gestos do palco: se o dedo levantar fora dele — ou
   * o navegador cancelar o toque — o gesto morre junto, e o que ele mudou
   * vira passo. Sem isso o movimento ficava só no desenho e sumia no
   * recarregamento seguinte.
   */
  useEffect(() => {
    const encerrar = () => {
      // Um microtask de atraso deixa o handler do palco agir primeiro. Sem
      // isso esta rede cortaria a inércia antes de ela começar, e todo
      // arremesso pararia debaixo do dedo.
      queueMicrotask(() => {
        pointersRef.current.clear();
        pinchRef.current = null;
        dragRef.current = null;
        if (animacaoRef.current === null && vivoRef.current) {
          encerrarComCommit();
        }
      });
    };
    window.addEventListener("pointerup", encerrar);
    window.addEventListener("pointercancel", encerrar);
    return () => {
      window.removeEventListener("pointerup", encerrar);
      window.removeEventListener("pointercancel", encerrar);
    };
  }, [encerrarComCommit]);

  /** Coordenadas do dedo convertidas pro tamanho real do palco. */
  function stagePoint(e: React.PointerEvent): Point {
    const rect = stageRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * STAGE.width,
      y: ((e.clientY - rect.top) / rect.height) * STAGE.height,
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    // Uma animação em curso é interrompida pelo toque: quem manda é o dedo.
    if (animacaoRef.current !== null) {
      cancelAnimationFrame(animacaoRef.current);
      animacaoRef.current = null;
      encerrarComCommit();
    }
    amostrasRef.current = { x: [], y: [] };

    const point = stagePoint(e);
    pointersRef.current.set(e.pointerId, point);

    const dedos = [...pointersRef.current.values()];
    if (dedos.length === 2 && selected) {
      // Dois dedos no palco: escala e gira a camada já escolhida, em vez de
      // trocar de camada no meio do gesto.
      dragRef.current = null;
      pinchRef.current = {
        id: selected.id,
        distancia: distance(dedos[0], dedos[1]),
        angulo: angle(dedos[0], dedos[1]),
        size: selected.size,
        rotation: selected.rotation,
      };
      capturar(e);
      return;
    }

    const alvo = camadaNoPonto(point);
    setSelectedId(alvo?.id ?? null);
    if (!alvo) return;
    dragRef.current = {
      id: alvo.id,
      dx: point.x - alvo.x,
      dy: point.y - alvo.y,
    };
    capturar(e);
  }

  /**
   * A captura é o que mantém o arrastar vivo quando o dedo sai do palco. Ela
   * pode ser recusada (ponteiro já solto, por exemplo), e aí o gesto continua
   * valendo — por isso nunca pode derrubar o resto do toque.
   */
  function capturar(e: React.PointerEvent) {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // sem captura o arrastar ainda funciona dentro do palco
    }
  }

  /**
   * Puxar a alça: a distância até o centro vira tamanho, o ângulo vira giro.
   *
   * O gesto é acompanhado no window, não no próprio botão. Esperar o
   * "pointerup" chegar na alça deixava o giro preso quando o evento se perdia
   * — e só soltava ao tocar em outro lugar da tela.
   */
  function onAlcaDown(e: React.PointerEvent) {
    if (!selected) return;
    // Sem isto o toque na alça viraria arrastar da camada logo abaixo dela.
    e.stopPropagation();
    const centro = { x: selected.x, y: selected.y };
    const inicio = stagePoint(e);
    const base = {
      id: selected.id,
      distancia: Math.max(1, distance(centro, inicio)),
      angulo: angle(centro, inicio),
      size: selected.size,
      rotation: selected.rotation,
    };
    alcaRef.current = base;

    const mover = (ev: PointerEvent) => {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;
      const point = {
        x: ((ev.clientX - rect.left) / rect.width) * STAGE.width,
        y: ((ev.clientY - rect.top) / rect.height) * STAGE.height,
      };
      const escala = distance(centro, point) / base.distancia;
      const giro = shortestTurn(base.angulo, angle(centro, point));
      vivoRef.current = {
        id: base.id,
        size: Math.round(clamp(base.size * escala, 8, 900)),
        rotation: Math.round(clamp(base.rotation + giro, -180, 180)),
      };
      const l = camadasRef.current.find((c) => c.id === base.id);
      const ctx = stageCanvasRef.current?.getContext("2d");
      if (l && ctx) {
        medidasRef.current.set(
          base.id,
          measureLayer(ctx, { ...l, ...vivoRef.current }),
        );
      }
      agendarPintura();
    };

    const soltar = () => {
      alcaRef.current = null;
      encerrarComCommit();
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", soltar);
    };

    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
  }

  /**
   * Botão de mover: a camada anda o mesmo tanto que o dedo, em vez de pular
   * pra baixo dele — o dedo está no canto do palco, longe da peça.
   */
  function onMoverDown(e: React.PointerEvent) {
    if (!selected) return;
    e.stopPropagation();
    amostrasRef.current = { x: [], y: [] };
    const inicio = stagePoint(e);
    const base = { id: selected.id, x: selected.x, y: selected.y };

    const mover = (ev: PointerEvent) => {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;
      const ponto = {
        x: ((ev.clientX - rect.left) / rect.width) * STAGE.width,
        y: ((ev.clientY - rect.top) / rect.height) * STAGE.height,
      };
      const bruto = {
        x: base.x + (ponto.x - inicio.x),
        y: base.y + (ponto.y - inicio.y),
      };
      const t = ev.timeStamp;
      amostrasRef.current.x.push({ valor: bruto.x, t });
      amostrasRef.current.y.push({ valor: bruto.y, t });
      if (amostrasRef.current.x.length > 12) {
        amostrasRef.current.x.shift();
        amostrasRef.current.y.shift();
      }
      vivoRef.current = { id: base.id, ...comImã(base.id, bruto.x, bruto.y) };
      agendarPintura();
    };

    const soltar = () => {
      soltarComInercia(base.id);
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", soltar);
    };

    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, stagePoint(e));
    const dedos = [...pointersRef.current.values()];

    const pinch = pinchRef.current;
    if (pinch && dedos.length < 2) pinchRef.current = null;
    if (pinch && dedos.length >= 2) {
      const escala = distance(dedos[0], dedos[1]) / (pinch.distancia || 1);
      const giro = shortestTurn(pinch.angulo, angle(dedos[0], dedos[1]));
      vivoRef.current = {
        id: pinch.id,
        size: Math.round(clamp(pinch.size * escala, 8, 900)),
        rotation: Math.round(clamp(pinch.rotation + giro, -180, 180)),
      };
      // O tamanho muda a caixa, e a caixa é o que o imã e a moldura usam.
      const l = camadasRef.current.find((c) => c.id === pinch.id);
      const ctx = stageCanvasRef.current?.getContext("2d");
      if (l && ctx) {
        medidasRef.current.set(
          pinch.id,
          measureLayer(ctx, { ...l, ...vivoRef.current }),
        );
      }
      agendarPintura();
      return;
    }

    const drag = dragRef.current;
    if (!drag) return;
    const point = stagePoint(e);
    const bruto = { x: point.x - drag.dx, y: point.y - drag.dy };
    // O relógio vem do próprio evento: é o instante em que o dedo esteve ali.
    const t = e.timeStamp;
    amostrasRef.current.x.push({ valor: bruto.x, t });
    amostrasRef.current.y.push({ valor: bruto.y, t });
    if (amostrasRef.current.x.length > 12) {
      amostrasRef.current.x.shift();
      amostrasRef.current.y.shift();
    }
    vivoRef.current = { id: drag.id, ...comImã(drag.id, bruto.x, bruto.y) };
    agendarPintura();
  }

  function onPointerUp(e: React.PointerEvent) {
    const arrastava = dragRef.current;
    const pincava = pinchRef.current;
    pointersRef.current.delete(e.pointerId);
    const dedos = [...pointersRef.current.values()];

    if (dedos.length === 0 && vivoRef.current) {
      // Arrastar termina com inércia; escalar e girar param onde pararam.
      if (arrastava) soltarComInercia(arrastava.id);
      else if (pincava) encerrarComCommit();
      else encerrarComCommit();
    }

    // Tirar um dedo tem que encerrar a pinça na hora. Enquanto isso dependia
    // de todos os "pointerup" chegarem, um evento perdido deixava o giro
    // ligado pra sempre: a camada seguia girando ao encostar no palco.
    if (dedos.length < 2) pinchRef.current = null;

    if (dedos.length === 0) {
      dragRef.current = null;
    } else if (dedos.length === 1 && selected && !dragRef.current) {
      // Sobrou um dedo depois da pinça: ele volta a arrastar, em vez de a
      // camada ficar presa até levantar tudo.
      dragRef.current = {
        id: selected.id,
        dx: dedos[0].x - selected.x,
        dy: dedos[0].y - selected.y,
      };
    }

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ponteiro já solto pelo navegador
    }
  }

  /** O navegador pode tirar a captura sozinho — aí o gesto acabou. */
  function onLostCapture(e: React.PointerEvent) {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) dragRef.current = null;
  }

  /**
   * O PNG de verdade sai só quando pedido, num canvas separado: é 3x maior que
   * o palco e recortado, e refazer isso a cada arrastada engasga no celular.
   */
  function gerarPng() {
    const canvas = exportCanvasRef.current ?? document.createElement("canvas");
    exportCanvasRef.current = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Camada recém-criada ainda pode não ter medida: o desenho mede num
    // efeito, e o toque em Gerar PNG pode chegar antes dele.
    const cantos = layers
      .map((l) => {
        const size = sizes.get(l.id);
        return size ? layerCorners(l, size) : null;
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
    const cru = unionBounds(cantos);
    // Uma folga em volta do recorte: cortar rente ao glifo deixa o
    // antisserrilhado das bordas encostando no limite do PNG.
    const folga = Math.max(...layers.map((l) => l.size), 0) * 0.08;
    const area =
      trim && cru
        ? {
            left: cru.left - folga,
            top: cru.top - folga,
            right: cru.right + folga,
            bottom: cru.bottom + folga,
          }
        : { left: 0, top: 0, right: STAGE.width, bottom: STAGE.height };

    const width = Math.max(1, area.right - area.left);
    const height = Math.max(1, area.bottom - area.top);
    const escala = safeScale(width, height);
    canvas.width = Math.ceil(width * escala);
    canvas.height = Math.ceil(height * escala);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(escala, escala);
    ctx.translate(-area.left, -area.top);

    layers.forEach((layer) => {
      ctx.save();
      ctx.translate(layer.x, layer.y);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      drawLayer(ctx, layer);
      ctx.restore();
    });

    setPng(canvas.toDataURL("image/png"));
  }

  function adicionar(layer: Layer) {
    despacharAcao({ type: "adicionar", layer });
    setAba("conteudo");
  }

  function remover(id: string) {
    const alvo = layers.find((l) => l.id === id);
    despacharAcao({ type: "remover", id });
    // Apagar não pede confirmação: pede volta. O aviso some sozinho, e até lá
    // um toque devolve a camada inteira, com estilo e posição.
    setAviso({
      texto: `"${(alvo?.text ?? "").split("\n")[0] || "camada"}" removida`,
    });
  }

  /**
   * A lista mostra a camada da frente em cima; o desenho pinta na ordem
   * inversa. A conversão fica só aqui, pra não espalhar índice invertido.
   */
  const daFrentePraTras = [...layers].reverse();

  function reordenar(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const de = daFrentePraTras.findIndex((l) => l.id === active.id);
    const para = daFrentePraTras.findIndex((l) => l.id === over.id);
    if (de < 0 || para < 0) return;
    // A lista está de trás pra frente em relação ao desenho, então os índices
    // viram antes de entrar no histórico.
    const ultimo = layers.length - 1;
    despacharAcao({ type: "reordenar", de: ultimo - de, para: ultimo - para });
  }

  function alinhar(modo: AlignMode) {
    if (!selected) return;
    const size = sizes.get(selected.id);
    if (!size) return;
    patch(alignedPosition(selected, size, modo, STAGE));
  }

  function distribuir(eixo: "x" | "y") {
    const novos = distributedValues(layers.map((l) => l[eixo]));
    // Todas as camadas num passo só: desfazer tem que devolver a distribuição
    // inteira, não uma camada por vez.
    layers.forEach((l, i) =>
      despacharAcao({
        type: "alterar",
        id: l.id,
        patch: { [eixo]: novos[i] },
        coalesce: "distribuir",
      }),
    );
    fecharPasso();
  }

  async function loadFont(file: File) {
    setFontError(null);
    const label = file.name.replace(/\.[^.]+$/, "");
    const custom = `lettering-${label.replace(/[^a-zA-Z0-9]/g, "-")}-${Date.now()}`;
    try {
      const face = new FontFace(custom, await file.arrayBuffer());
      await face.load();
      document.fonts.add(face);
      setFonts((current) => [...current, { family: `"${custom}"`, label }]);
      patch({ family: `"${custom}"` });
    } catch {
      setFontError(
        `Não deu pra ler "${file.name}". O navegador aceita .ttf, .otf, .ttc, .woff e .woff2 — atalho do Finder e arquivo protegido não funcionam.`,
      );
    }
  }

  // A fonte do cliente vive só na memória do navegador: ao voltar de um
  // rascunho ela não existe mais, e a peça desenha com a fonte de reserva.
  const faltando = fontesFaltando(
    layers,
    fonts.map((f) => f.family),
  );

  // A resposta acontece no dedo descendo, não no clique concluído: esperar o
  // toque terminar pra dar sinal de vida lê como travamento.
  const chip =
    "shrink-0 rounded-full border px-3 py-2 text-sm whitespace-nowrap transition-transform duration-100 active:scale-95";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 lg:max-w-none lg:grid lg:grid-cols-[1fr_minmax(320px,400px)] lg:items-start">
      {/* O palco é a peça: no celular ele fica no topo e gruda, pra editar
          vendo o resultado sem precisar rolar a página. */}
      <div className="sticky top-0 z-10 -mx-4 bg-neutral-50 px-4 py-2 lg:static lg:mx-0 lg:bg-transparent lg:p-0">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => adicionar(novaCamada({ text: "Texto" }))}
            className={`${chip} flex-1 border-neutral-900 bg-neutral-900 text-white`}
          >
            <Type aria-hidden="true" className="mr-1 inline size-4" />
            Texto
          </button>
          <button
            type="button"
            onClick={() =>
              adicionar(
                novaCamada({
                  kind: "emoji",
                  text: "✨",
                  family: EMOJI_FAMILY,
                  size: 200,
                }),
              )
            }
            className={`${chip} flex-1 border-neutral-900 bg-neutral-900 text-white`}
          >
            <Smile aria-hidden="true" className="mr-1 inline size-4" />
            Emoji
          </button>
          <button
            type="button"
            aria-label="Desfazer"
            disabled={!podeDesfazer(history)}
            onClick={() => setHistory(desfazer)}
            className={`${chip} border-neutral-200 bg-white text-neutral-700 disabled:opacity-40`}
          >
            <Undo2 aria-hidden="true" className="inline size-4" />
          </button>
          <button
            type="button"
            aria-label="Refazer"
            disabled={!podeRefazer(history)}
            onClick={() => setHistory(refazer)}
            className={`${chip} border-neutral-200 bg-white text-neutral-700 disabled:opacity-40`}
          >
            <Redo2 aria-hidden="true" className="inline size-4" />
          </button>
          <button
            type="button"
            onClick={() => setPainel((atual) => (atual ? null : "camadas"))}
            aria-expanded={painel !== null}
            aria-controls="lettering-painel"
            aria-label="Mais opções"
            className={`${chip} ${
              painel
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 bg-white text-neutral-700"
            }`}
          >
            <MoreHorizontal aria-hidden="true" className="inline size-4" />
          </button>
        </div>

        <div
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerUp}
          onLostPointerCapture={onLostCapture}
          style={{
            background: CHECKERBOARD,
            aspectRatio: `${STAGE.width} / ${STAGE.height}`,
          }}
          className="relative w-full touch-none overflow-hidden rounded-lg border border-neutral-200 select-none"
        >
          <canvas
            ref={stageCanvasRef}
            width={STAGE.width}
            height={STAGE.height}
            className="size-full"
          />

          {/* A alça mora num canto do palco, não em cima da camada. No canto
              da moldura ela cobria justamente a área que se quer arrastar — e
              sumia da tela quando a camada passava da borda. */}
          {selected ? (
            <>
              <button
                type="button"
                aria-label="Mover a camada"
                onPointerDown={onMoverDown}
                className="absolute bottom-3 left-3 grid size-12 touch-none place-items-center rounded-full border border-neutral-200 bg-white/95 text-neutral-700 shadow-md transition-transform duration-100 active:scale-95 active:bg-neutral-100"
              >
                <Move aria-hidden="true" className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Girar e redimensionar"
                onPointerDown={onAlcaDown}
                className="absolute right-3 bottom-3 grid size-12 touch-none place-items-center rounded-full border border-neutral-200 bg-white/95 text-neutral-700 shadow-md transition-transform duration-100 active:scale-95 active:bg-neutral-100"
              >
                <RotateCw aria-hidden="true" className="size-5" />
              </button>
            </>
          ) : null}
        </div>

        {aviso ? (
          <div
            role="status"
            className="mt-2 flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 shadow-sm"
          >
            <span className="flex-1 truncate">{aviso.texto}</span>
            <button
              type="button"
              onClick={() => {
                setHistory(desfazer);
                setAviso(null);
              }}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
            >
              Desfazer
            </button>
          </div>
        ) : null}

        {faltando.length > 0 ? (
          <p
            role="alert"
            className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          >
            O rascunho usa uma fonte que veio de arquivo e não fica salva.
            Carregue a fonte de novo pra peça voltar ao normal.
          </p>
        ) : null}

        <p className="mt-1 text-center text-xs text-neutral-500">
          Arraste a peça ou use os botões do palco: um move, o outro gira e muda
          o tamanho. Dois dedos fazem as duas coisas juntas.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {painel ? (
          <div
            id="lettering-painel"
            className="rounded-lg border border-neutral-200 bg-white"
          >
            <div className="flex gap-1 border-b border-neutral-200 p-2">
              <button
                type="button"
                onClick={() => setPainel("camadas")}
                className={`flex-1 rounded-md px-2 py-2 text-sm ${
                  painel === "camadas"
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600"
                }`}
              >
                <Layers aria-hidden="true" className="mr-1 inline size-4" />
                Camadas
              </button>
              <button
                type="button"
                onClick={() => setPainel("alinhar")}
                className={`flex-1 rounded-md px-2 py-2 text-sm ${
                  painel === "alinhar"
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600"
                }`}
              >
                <AlignCenter
                  aria-hidden="true"
                  className="mr-1 inline size-4"
                />
                Alinhamento
              </button>
            </div>

            {/* A lista vem de cima pra baixo como as camadas aparecem na
                peça: a primeira linha é a que fica na frente. */}
            <div hidden={painel !== "camadas"} className="p-2">
              <DndContext
                // Id fixo: sem ele o dnd-kit numera os textos de
                // acessibilidade em ordem de montagem, e servidor e cliente
                // chegam a números diferentes.
                id="lettering-camadas"
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={reordenar}
              >
                <SortableContext
                  items={daFrentePraTras.map((l) => l.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="space-y-1">
                    {daFrentePraTras.map((layer) => (
                      <LinhaDeCamada
                        key={layer.id}
                        layer={layer}
                        selecionada={layer.id === selectedId}
                        onSelecionar={() => setSelectedId(layer.id)}
                        onRemover={() => remover(layer.id)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            </div>

            <div hidden={painel !== "alinhar"} className="space-y-3 p-3">
              <div className="space-y-1.5">
                <p className={LABEL}>Alinhar no palco</p>
                <div className="grid grid-cols-6 gap-1">
                  {(
                    [
                      ["esquerda", AlignStartVertical, "Alinhar à esquerda"],
                      [
                        "centro",
                        AlignCenterVertical,
                        "Centralizar na horizontal",
                      ],
                      ["direita", AlignEndVertical, "Alinhar à direita"],
                      ["topo", AlignStartHorizontal, "Alinhar ao topo"],
                      [
                        "meio",
                        AlignCenterHorizontal,
                        "Centralizar na vertical",
                      ],
                      ["base", AlignEndHorizontal, "Alinhar à base"],
                    ] as const
                  ).map(([modo, Icone, rotulo]) => (
                    <button
                      key={modo}
                      type="button"
                      aria-label={rotulo}
                      title={rotulo}
                      disabled={!selected}
                      onClick={() => alinhar(modo)}
                      className="grid h-11 place-items-center rounded-md border border-neutral-200 text-neutral-700 disabled:opacity-40"
                    >
                      <Icone aria-hidden="true" className="size-4" />
                    </button>
                  ))}
                </div>
                <p className="text-xs text-neutral-500">
                  Vale pra camada escolhida, contando a caixa já girada.
                </p>
              </div>

              <div className="space-y-1.5">
                <p className={LABEL}>Distribuir</p>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    disabled={layers.length < 3}
                    onClick={() => distribuir("x")}
                    className="h-11 rounded-md border border-neutral-200 text-sm text-neutral-700 disabled:opacity-40"
                  >
                    <AlignHorizontalSpaceAround
                      aria-hidden="true"
                      className="mr-1 inline size-4"
                    />
                    Na horizontal
                  </button>
                  <button
                    type="button"
                    disabled={layers.length < 3}
                    onClick={() => distribuir("y")}
                    className="h-11 rounded-md border border-neutral-200 text-sm text-neutral-700 disabled:opacity-40"
                  >
                    <AlignVerticalSpaceAround
                      aria-hidden="true"
                      className="mr-1 inline size-4"
                    />
                    Na vertical
                  </button>
                </div>
                <p className="text-xs text-neutral-500">
                  Espaça todas as camadas por igual, mantendo as das pontas no
                  lugar. Precisa de três ou mais.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {selected ? (
          <div className="rounded-lg border border-neutral-200 bg-white">
            <div className="flex items-center gap-1 border-b border-neutral-200 p-2">
              {(
                [
                  ["conteudo", "Conteúdo"],
                  ["estilo", "Estilo"],
                  ["efeitos", "Efeitos"],
                ] as const
              ).map(([id, rotulo]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAba(id)}
                  className={`flex-1 rounded-md px-2 py-2 text-sm ${
                    aba === id
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  {rotulo}
                </button>
              ))}
            </div>

            <div className="space-y-3 p-3">
              {aba === "conteudo" ? (
                <>
                  <div className="space-y-1.5">
                    <label className={LABEL} htmlFor="lettering-text">
                      {selected.kind === "emoji" ? "Emoji" : "Texto"}
                    </label>
                    <textarea
                      id="lettering-text"
                      value={selected.text}
                      onChange={(e) => patch({ text: e.target.value })}
                      rows={selected.kind === "emoji" ? 1 : 3}
                      className={INPUT}
                    />
                    {selected.kind === "emoji" ? (
                      <div className="flex flex-wrap gap-1">
                        {EMOJI_RAPIDOS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => patch({ text: emoji })}
                            className="rounded border border-neutral-200 px-3 py-2 text-lg hover:bg-neutral-50"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {selected.kind === "text" ? (
                    <div className="space-y-1.5">
                      <label className={LABEL} htmlFor="lettering-font">
                        Fonte
                      </label>
                      <select
                        id="lettering-font"
                        value={selected.family}
                        onChange={(e) => patch({ family: e.target.value })}
                        className={INPUT}
                      >
                        {fonts.map((font) => (
                          <option key={font.family} value={font.family}>
                            {font.label}
                          </option>
                        ))}
                      </select>
                      <label className="inline-flex cursor-pointer items-center gap-2 py-2 text-sm text-neutral-600">
                        <Upload aria-hidden="true" className="size-4" />
                        Carregar fonte do cliente
                        <input
                          type="file"
                          accept="font/*,.ttf,.otf,.ttc,.woff,.woff2,.TTF,.OTF"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void loadFont(file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {fontError ? (
                        <p role="alert" className="text-sm text-red-600">
                          {fontError}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : null}

              {aba === "estilo" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className={LABEL} htmlFor="lettering-size">
                      Tamanho
                    </label>
                    <input
                      id="lettering-size"
                      type="number"
                      min={8}
                      max={900}
                      value={selected.size}
                      onChange={(e) =>
                        patch({ size: Number(e.target.value) || 8 })
                      }
                      className={INPUT}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={LABEL} htmlFor="lettering-rotation">
                      Girar
                    </label>
                    <input
                      id="lettering-rotation"
                      type="number"
                      min={-180}
                      max={180}
                      value={selected.rotation}
                      onChange={(e) =>
                        patch({ rotation: Number(e.target.value) || 0 })
                      }
                      className={INPUT}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={LABEL} htmlFor="lettering-color">
                      Cor
                    </label>
                    <input
                      id="lettering-color"
                      type="color"
                      value={selected.color}
                      onChange={(e) => patch({ color: e.target.value })}
                      className="h-11 w-full rounded-md border border-neutral-200 bg-white p-1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={LABEL} htmlFor="lettering-align">
                      Alinhamento
                    </label>
                    <select
                      id="lettering-align"
                      value={selected.align}
                      onChange={(e) =>
                        patch({ align: e.target.value as Layer["align"] })
                      }
                      className={INPUT}
                    >
                      <option value="left">Esquerda</option>
                      <option value="center">Centro</option>
                      <option value="right">Direita</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className={LABEL} htmlFor="lettering-line-height">
                      Entrelinha
                    </label>
                    <input
                      id="lettering-line-height"
                      type="number"
                      step={0.05}
                      min={0.5}
                      max={3}
                      value={selected.lineHeight}
                      onChange={(e) =>
                        patch({ lineHeight: Number(e.target.value) || 1 })
                      }
                      className={INPUT}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={LABEL} htmlFor="lettering-tracking">
                      Espaçamento
                    </label>
                    <input
                      id="lettering-tracking"
                      type="number"
                      value={selected.tracking}
                      onChange={(e) =>
                        patch({ tracking: Number(e.target.value) || 0 })
                      }
                      className={INPUT}
                    />
                  </div>
                </div>
              ) : null}

              {aba === "efeitos" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className={LABEL} htmlFor="lettering-stroke">
                        Contorno
                      </label>
                      <input
                        id="lettering-stroke"
                        type="number"
                        min={0}
                        max={60}
                        value={selected.stroke}
                        onChange={(e) =>
                          patch({
                            stroke: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className={INPUT}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className={LABEL} htmlFor="lettering-stroke-color">
                        Cor do contorno
                      </label>
                      <input
                        id="lettering-stroke-color"
                        type="color"
                        value={selected.strokeColor}
                        onChange={(e) => patch({ strokeColor: e.target.value })}
                        disabled={selected.stroke === 0}
                        className="h-11 w-full rounded-md border border-neutral-200 bg-white p-1 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 py-1 text-sm font-medium text-neutral-700">
                    <input
                      type="checkbox"
                      checked={selected.shadow}
                      onChange={(e) => patch({ shadow: e.target.checked })}
                      className="size-5 accent-neutral-900"
                    />
                    Sombra projetada
                  </label>
                  {selected.shadow ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label
                          className={LABEL}
                          htmlFor="lettering-shadow-blur"
                        >
                          Desfoque
                        </label>
                        <input
                          id="lettering-shadow-blur"
                          type="number"
                          min={0}
                          value={selected.shadowBlur}
                          onChange={(e) =>
                            patch({
                              shadowBlur: Math.max(
                                0,
                                Number(e.target.value) || 0,
                              ),
                            })
                          }
                          className={INPUT}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label
                          className={LABEL}
                          htmlFor="lettering-shadow-color"
                        >
                          Cor da sombra
                        </label>
                        <input
                          id="lettering-shadow-color"
                          type="color"
                          value={selected.shadowColor}
                          onChange={(e) =>
                            patch({ shadowColor: e.target.value })
                          }
                          className="h-11 w-full rounded-md border border-neutral-200 bg-white p-1"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={LABEL} htmlFor="lettering-shadow-x">
                          Deslocar X
                        </label>
                        <input
                          id="lettering-shadow-x"
                          type="number"
                          value={selected.shadowX}
                          onChange={(e) =>
                            patch({ shadowX: Number(e.target.value) || 0 })
                          }
                          className={INPUT}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={LABEL} htmlFor="lettering-shadow-y">
                          Deslocar Y
                        </label>
                        <input
                          id="lettering-shadow-y"
                          type="number"
                          value={selected.shadowY}
                          onChange={(e) =>
                            patch({ shadowY: Number(e.target.value) || 0 })
                          }
                          className={INPUT}
                        />
                      </div>
                    </div>
                  ) : null}

                  <label className="flex cursor-pointer items-center gap-2 py-1 text-sm font-medium text-neutral-700">
                    <input
                      type="checkbox"
                      checked={selected.box}
                      onChange={(e) => patch({ box: e.target.checked })}
                      className="size-5 accent-neutral-900"
                    />
                    Fundo atrás do texto
                  </label>
                  {selected.box ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className={LABEL} htmlFor="lettering-box-color">
                          Cor do fundo
                        </label>
                        <input
                          id="lettering-box-color"
                          type="color"
                          value={selected.boxColor}
                          onChange={(e) => patch({ boxColor: e.target.value })}
                          className="h-11 w-full rounded-md border border-neutral-200 bg-white p-1"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={LABEL} htmlFor="lettering-box-radius">
                          Cantos
                        </label>
                        <input
                          id="lettering-box-radius"
                          type="number"
                          min={0}
                          value={selected.boxRadius}
                          onChange={(e) =>
                            patch({
                              boxRadius: Math.max(
                                0,
                                Number(e.target.value) || 0,
                              ),
                            })
                          }
                          className={INPUT}
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <label
                          className={LABEL}
                          htmlFor="lettering-box-padding"
                        >
                          Respiro
                        </label>
                        <input
                          id="lettering-box-padding"
                          type="number"
                          min={0}
                          value={selected.boxPadding}
                          onChange={(e) =>
                            patch({
                              boxPadding: Math.max(
                                0,
                                Number(e.target.value) || 0,
                              ),
                            })
                          }
                          className={INPUT}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-500">
            Toque numa camada no palco ou na fita acima pra editar.
          </p>
        )}

        <div className="space-y-2 rounded-lg border border-neutral-200 bg-white p-3">
          <label className="flex cursor-pointer items-center gap-2 py-1 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={trim}
              onChange={(e) => setTrim(e.target.checked)}
              className="size-5 accent-neutral-900"
            />
            Cortar no conteúdo (figurinha)
          </label>

          <Button size="lg" className="w-full" onClick={gerarPng}>
            <Download aria-hidden="true" data-icon="inline-start" />
            Gerar PNG
          </Button>
        </div>
      </div>

      {/* O PNG aparece numa folha por cima: no celular é aqui que se segura o
          dedo pra salvar em Fotos, que é o único caminho que o iOS oferece. */}
      {png ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-neutral-900/80 p-4">
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 overflow-auto rounded-lg bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium text-neutral-900">
                Seu lettering
              </h2>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setPng(null)}
                className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            <div
              style={{ background: CHECKERBOARD }}
              className="grid flex-1 place-items-center rounded-md border border-neutral-200 p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={png}
                alt="Lettering pronto"
                className="max-h-[50svh] w-auto max-w-full"
              />
            </div>

            <p className="text-sm text-neutral-600">
              No celular: segure o dedo na imagem e escolha &quot;Adicionar às
              Fotos&quot;. Depois é só usar o sticker de foto no story.
            </p>

            <Button
              render={<a href={png} download="lettering.png" />}
              // Baixar é um link com download, não um botão: sem isso o Base UI
              // avisa que as semânticas nativas de <button> se perdem.
              nativeButton={false}
              size="lg"
              className="w-full"
            >
              <Download aria-hidden="true" data-icon="inline-start" />
              Baixar no computador
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LinhaDeCamada({
  layer,
  selecionada,
  onSelecionar,
  onRemover,
}: {
  layer: Layer;
  selecionada: boolean;
  onSelecionar: () => void;
  onRemover: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: layer.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-40" : ""}
    >
      <div
        className={`flex items-center gap-1 rounded-md border ${
          selecionada
            ? "border-neutral-900 bg-neutral-50"
            : "border-neutral-200 bg-white"
        }`}
      >
        <button
          type="button"
          aria-label="Mudar a ordem"
          className="cursor-grab touch-none p-2 text-neutral-400"
          {...attributes}
          {...listeners}
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          onClick={onSelecionar}
          className="flex-1 truncate py-3 pr-2 text-left text-sm"
        >
          {layer.text.split("\n")[0] || "(vazio)"}
        </button>
        <button
          type="button"
          aria-label="Remover camada"
          onClick={onRemover}
          className="p-3 text-neutral-500"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </button>
      </div>
    </li>
  );
}
