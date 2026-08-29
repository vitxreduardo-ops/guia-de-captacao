"use client";

import {
  AlignCenter,
  BookMarked,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceAround,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalSpaceAround,
  Copy,
  Crosshair,
  Download,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  MoreHorizontal,
  Move,
  Share2,
  Redo2,
  Undo2,
  RotateCw,
  Palette,
  Smile,
  Sparkles,
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
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { snap, type Guia } from "@/lib/letteringSnap";
import {
  molaParada,
  passoDaMola,
  projetar,
  resistencia,
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
  paraGuardar,
  validar as validarLayout,
} from "@/lib/letteringStorage";
import {
  carregarBiblioteca,
  excluirLayoutAction,
  guardarFonteAction,
  guardarLayoutAction,
} from "@/app/admin/lettering/actions";
import type { FonteSalva, LayoutSalvo } from "@/lib/letteringLibrary";
import { Button } from "@/components/ui/button";
import {
  angle,
  clamp,
  distance,
  hitsLayer,
  layerCorners,
  shortestTurn,
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
import {
  drawLayer,
  esqueceMedidas,
  EXPORT_SCALE,
  measureLayer,
  PASSO_DA_GRADE,
  safeScale,
  STAGE,
} from "@/lib/letteringDraw";

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
/** A pessoa pediu menos movimento no sistema? Então nada de deslizar sozinho. */
function semMovimento() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Pulso curto onde o aparelho oferecer. No iPhone o Safari ignora, sem erro. */
function vibrar(ms: number) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // aparelho sem vibração
  }
}

/**
 * Fundos de prova. O xadrez mostra que o PNG é mesmo transparente; os outros
 * existem porque a peça é um overlay — lettering branco some no xadrez claro e
 * o problema só apareceria depois, já no story.
 */
const FUNDOS = {
  xadrez:
    "repeating-conic-gradient(#e5e5e5 0% 25%, #ffffff 0% 50%) 50% / 16px 16px",
  claro: "#f5f5f4",
  escuro: "#171717",
  foto: "linear-gradient(160deg, #5b7fa6 0%, #a8b8a0 45%, #d9b98c 75%, #6b4f3a 100%)",
} as const;

/**
 * A vista sobre o palco: canto de onde se olha e quanto se aproxima. A peça
 * não muda de tamanho quando o zoom muda — o que muda é a lente.
 */
type Vista = { x: number; y: number; z: number };

/** Até onde a lente vai. Perto o bastante pra ajustar letra, longe o
 *  bastante pra ver a peça inteira fora do palco. */
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 5;

type Dock =
  | "texto"
  | "estilo"
  | "efeitos"
  | "emoji"
  | "camadas"
  | "alinhar"
  | "biblioteca"
  | "exportar";

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
    (id: string | null) =>
      setHistory((h) => despachar(h, { type: "selecionar", id })),
    [],
  );
  const [fonts, setFonts] = useState(SYSTEM_FONTS);
  const [fontError, setFontError] = useState<string | null>(null);
  const [trim, setTrim] = useState(true);
  /** null = dock fechada. Um painel de cada vez, que é o que cabe no celular. */
  const [dock, setDock] = useState<Dock | null>(null);
  const [layouts, setLayouts] = useState<LayoutSalvo[]>([]);
  const [fontesSalvas, setFontesSalvas] = useState<FonteSalva[]>([]);
  const [nomeDoLayout, setNomeDoLayout] = useState("");
  const [ocupado, setOcupado] = useState(false);
  /**
   * `comDesfazer` só existe onde desfazer é a resposta certa. Num recado de
   * "salvo", o botão desfaria a última edição — não o salvamento.
   */
  /** Ajustes da vista, no canto do palco. */
  const [ajustes, setAjustes] = useState(false);
  const [grade, setGrade] = useState(false);
  const [encaixe, setEncaixe] = useState(true);
  const [aviso, setAviso] = useState<{
    texto: string;
    comDesfazer?: boolean;
  } | null>(null);
  const [sizes, setSizes] = useState<Map<string, Size>>(new Map());
  /** PNG só existe depois de pedir: gerar em 3x a cada toque trava o celular. */
  const [png, setPng] = useState<{
    url: string;
    largura: number;
    altura: number;
  } | null>(null);
  const [qualidade, setQualidade] = useState(EXPORT_SCALE);
  /** Fundo da prévia: a peça é um overlay e precisa ser vista sobre os dois. */
  const [fundo, setFundo] = useState<"xadrez" | "claro" | "escuro" | "foto">(
    "xadrez",
  );
  /** O arquivo pronto pra folha de compartilhamento do sistema. */
  const arquivoRef = useRef<File | null>(null);
  /**
   * Nem todo navegador entrega arquivo pra folha do sistema. Onde não entrega,
   * o caminho antigo — segurar o dedo na imagem — continua valendo.
   */
  const podeCompartilhar = useSyncExternalStore(
    () => () => {},
    () =>
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({
        files: [new File([], "t.png", { type: "image/png" })],
      }),
    () => false,
  );

  const stageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  /** Dedos em cima do palco, por pointerId, em coordenadas do palco. */
  const pointersRef = useRef<Map<number, Point>>(new Map());
  /**
   * Os mesmos dedos, mas na medida da tela.
   *
   * A pinça precisa disto: em coordenadas do palco a distância entre os dedos
   * já vem dividida pelo zoom, e usar isso pra calcular o próprio zoom se
   * realimenta — afastar os dedos acabava diminuindo a peça.
   */
  const dedosNaTelaRef = useRef<Map<number, Point>>(new Map());
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  /**
   * Onde o dedo encostou, na medida da tela, e se o gesto já virou movimento.
   *
   * Sem essa folga, o tremor natural do dedo num toque de escolha já arrastava
   * a peça e gravava um passo no histórico — e tocar o vazio pra desmarcar
   * mexia a vista de brinde.
   */
  const inicioRef = useRef<{ ponto: Point; armado: boolean } | null>(null);

  /** Folga em pixels de tela antes de um toque virar arrasto. */
  const FOLGA_DO_ARRASTO = 10;

  /**
   * Dois dedos que encostam e saem sem mexer nada desfazem, como no sistema.
   *
   * Desfazer é a ação que autoriza experimentar, e num editor de toque é das
   * mais frequentes — estava a dois toques, dentro do menu de ajustes. Um
   * gesto sem alvo resolve sem tomar espaço de tela.
   */
  const doisDedosRef = useRef<{ t: number; moveu: boolean } | null>(null);
  /**
   * Navegação do palco: arrastar o vazio move a vista, dois dedos aproximam.
   * A pinça é da lente, não da peça — o tamanho da peça sai das alças, como
   * em qualquer editor.
   */
  const navRef = useRef<{
    modo: "mover" | "lente";
    /** Ponto do palco sob o dedo (ou sob o meio dos dedos) quando começou. */
    ancora: Point;
    /** Onde esse ponto estava na tela, em unidades de palco sem zoom. */
    ancoraLocal: Point;
    distancia: number;
    zoom: number;
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
  const vivoRef = useRef<(Partial<Layer> & { id: string }) | null>(null);
  const guiasRef = useRef<Guia[]>([]);
  const quadroRef = useRef<number | null>(null);
  const medidasRef = useRef<Map<string, Size>>(new Map());
  const camadasRef = useRef<Layer[]>(layers);
  const gradeRef = useRef(false);
  const encaixeRef = useRef(true);
  const selecaoRef = useRef<string | null>(selectedId);
  /** Posições recentes do dedo, pra saber a velocidade na hora de soltar. */
  const amostrasRef = useRef<{ x: Amostra[]; y: Amostra[] }>({ x: [], y: [] });
  const animacaoRef = useRef<number | null>(null);
  const medirRef = useRef<HTMLCanvasElement | null>(null);
  /**
   * A moldura com as alças é DOM, não canvas: alça precisa receber toque. Ela
   * é posicionada direto pelo style dentro do laço de pintura, sem passar pelo
   * React — no meio de um gesto isso custaria um render por quadro.
   */
  const molduraRef = useRef<HTMLDivElement | null>(null);
  /**
   * Tamanho do palco na tela, medido fora do laço.
   *
   * Perguntar isso ao navegador obriga ele a recalcular a página, e estava
   * sendo perguntado a cada movimento de dedo e a cada quadro de desenho.
   */
  const caixaDoPalcoRef = useRef<DOMRect | null>(null);
  /**
   * Altura da janela em unidades do palco.
   *
   * A janela deixou de ter a proporção do palco: ela ocupa a tela que sobra, e
   * o palco virou o mundo por onde se anda. A largura visível continua sendo a
   * largura do palco em zoom 1; a altura sai da forma da janela.
   */
  const alturaVisivelRef = useRef(STAGE.height);
  /** A pintura vista de fora, pra quem é declarado antes dela. */
  const pinturaRef = useRef<() => void>(() => {});
  /** A vista se acomoda uma vez na abertura, e não a cada remedida. */
  const jaEnquadrouRef = useRef(false);
  /**
   * Deslocamento da vista, em unidades do palco.
   *
   * O painel de ferramentas sobe por cima do palco e tapa justamente onde a
   * peça costuma estar. Em vez de encolher o palco, a vista anda até deixar a
   * camada escolhida na faixa que sobrou visível.
   */
  const camRef = useRef<Vista>({ x: 0, y: 0, z: 1 });
  const camAnimRef = useRef<number | null>(null);
  /** Posições recentes da vista, pra ela continuar como a peça continua. */
  const amostrasDaVistaRef = useRef<{ x: Amostra[]; y: Amostra[] }>({
    x: [],
    y: [],
  });
  const painelRef = useRef<HTMLDivElement | null>(null);

  /** Último toque, pra reconhecer o segundo como duplo. */
  const toqueRef = useRef<{
    id: string | null;
    t: number;
    ponto: Point;
  } | null>(null);
  /**
   * O atalho de teclado é registrado uma vez só e precisa chamar as ações
   * atuais; guardá-las em ref evita reassinar o evento a cada render.
   */
  const duplicarRef = useRef<(id: string) => void>(() => {});
  const removerRef = useRef<(id: string) => void>(() => {});

  const selected = layers.find((l) => l.id === selectedId) ?? null;

  const sensors = useSensors(
    // Sem a distância mínima, o toque que escolhe a camada viraria arraste.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  /** Remede o palco quando ele muda de tamanho, e não durante o gesto. */
  useEffect(() => {
    const palco = stageRef.current;
    if (!palco) return;
    const medir = () => {
      const caixa = palco.getBoundingClientRect();
      caixaDoPalcoRef.current = caixa;
      if (caixa.width > 0) {
        alturaVisivelRef.current = (caixa.height / caixa.width) * STAGE.width;
        const canvas = stageCanvasRef.current;
        if (canvas) {
          // O canvas acompanha a forma da janela, senão o desenho estica.
          const altura = Math.round(alturaVisivelRef.current);
          if (canvas.height !== altura) {
            canvas.height = altura;
            pinturaRef.current();
          }
        }
      }
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(palco);
    window.addEventListener("scroll", medir, true);
    window.addEventListener("resize", medir);
    return () => {
      observador.disconnect();
      window.removeEventListener("scroll", medir, true);
      window.removeEventListener("resize", medir);
    };
  }, []);

  // O desenho roda fora do React e precisa enxergar o estado atual sem ser
  // recriado a cada render — por isso o espelho em refs.
  useEffect(() => {
    camadasRef.current = layers;
    selecaoRef.current = selectedId;
    gradeRef.current = grade;
    encaixeRef.current = encaixe;
    pinturaRef.current = pintar;
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

    const base = canvas.width / STAGE.width;
    const { x: camX, y: camY, z } = camRef.current;
    const escala = base * z;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(escala, escala);
    ctx.translate(-camX, -camY);

    // A grade vem primeiro, atrás de tudo: ela é chão, não conteúdo. Os
    // pontos são desenhados só onde a vista alcança — percorrer o palco
    // inteiro custaria caro quando a lente está bem aproximada.
    if (gradeRef.current) {
      const passo = PASSO_DA_GRADE;
      const raio = Math.max(1, 1.5 / z);
      const de = {
        x: Math.floor(camX / passo) * passo,
        y: Math.floor(camY / passo) * passo,
      };
      const ate = {
        x: camX + STAGE.width / z,
        y: camY + alturaVisivelRef.current / z,
      };
      ctx.fillStyle = "rgba(23, 23, 23, .22)";
      for (let x = de.x; x <= ate.x; x += passo) {
        for (let y = de.y; y <= ate.y; y += passo) {
          ctx.beginPath();
          ctx.arc(x, y, raio, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    camadasRef.current.forEach((base) => {
      if (base.hidden) return;
      const layer = comGesto(base);
      ctx.save();
      ctx.translate(layer.x, layer.y);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      drawLayer(ctx, layer);
      ctx.restore();
    });

    // A moldura é DOM por causa das alças, e acompanha o gesto pelo style —
    // como as guias, ela nunca toca o canvas da exportação.
    const escolhida = camadasRef.current.find(
      (l) => l.id === selecaoRef.current,
    );
    const medida = escolhida ? medidasRef.current.get(escolhida.id) : null;
    const moldura = molduraRef.current;
    if (moldura) {
      if (escolhida && medida && !escolhida.hidden) {
        const layer = comGesto(escolhida);
        moldura.hidden = false;

        // Tamanho e posição em porcentagem obrigavam o navegador a recalcular
        // a página a cada quadro. Agora o tamanho fica fixo — na medida sem
        // zoom — e o gesto inteiro cabe numa transformação, que é o que o
        // navegador compõe sem refazer conta de layout.
        const caixa = caixaDoPalcoRef.current;
        const porUnidade = (caixa?.width ?? STAGE.width) / STAGE.width;

        const larguraBase = Math.round(medida.width * porUnidade);
        const alturaBase = Math.round(medida.height * porUnidade);
        if (moldura.dataset.w !== String(larguraBase)) {
          moldura.dataset.w = String(larguraBase);
          moldura.style.width = `${larguraBase}px`;
        }
        if (moldura.dataset.h !== String(alturaBase)) {
          moldura.dataset.h = String(alturaBase);
          moldura.style.height = `${alturaBase}px`;
        }
        const px = (layer.x - camX) * z * porUnidade;
        const py = (layer.y - camY) * z * porUnidade;
        moldura.style.transform =
          `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%) ` +
          `rotate(${layer.rotation}deg) scale(${z})`;
      } else {
        moldura.hidden = true;
      }
    }

    if (guiasRef.current.length > 0) {
      ctx.save();
      ctx.strokeStyle = "#D4187C";
      ctx.lineWidth = 1.5 / escala;
      ctx.setLineDash([]);
      guiasRef.current.forEach((guia) => {
        ctx.beginPath();
        if (guia.eixo === "x") {
          ctx.moveTo(guia.pos, camY);
          ctx.lineTo(guia.pos, camY + alturaVisivelRef.current / z);
        } else {
          ctx.moveTo(camX, guia.pos);
          ctx.lineTo(camX + STAGE.width / z, guia.pos);
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
      layers.forEach((layer) =>
        medidas.set(layer.id, measureLayer(ctx, layer)),
      );
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
      if (cancelado) return;
      // Chegou fonte: o que já foi medido pode ter sido medido com a reserva.
      esqueceMedidas();
      medirTudo();
    });
    return () => {
      cancelado = true;
    };
  }, [layers, pintar]);

  /** Redesenha o que não passa pela medição: a escolha e a grade. */
  useEffect(() => {
    pintar();
  }, [selectedId, grade, pintar]);

  /** A biblioteca é buscada quando a aba abre, não na carga da tela. */
  useEffect(() => {
    if (dock !== "biblioteca") return;
    let cancelado = false;
    carregarBiblioteca()
      .then(({ layouts, fontes }) => {
        if (cancelado) return;
        setLayouts(layouts);
        setFontesSalvas(fontes);
      })
      .catch(() => {
        if (!cancelado) setAviso({ texto: "Não deu pra ler a biblioteca." });
      });
    return () => {
      cancelado = true;
    };
  }, [dock]);

  // O atalho de teclado é assinado uma vez e chama as ações atuais por ref.
  useEffect(() => {
    duplicarRef.current = duplicar;
    removerRef.current = remover;
  });

  /** Desliza a vista até o enquadramento pedido, com mola. */
  const animarVista = useCallback(
    (alvo: Vista) => {
      if (camAnimRef.current !== null) {
        cancelAnimationFrame(camAnimRef.current);
        camAnimRef.current = null;
      }

      if (semMovimento()) {
        camRef.current = alvo;
        pintar();
        return;
      }

      let molaX: Mola = { valor: camRef.current.x, velocidade: 0 };
      let molaY: Mola = { valor: camRef.current.y, velocidade: 0 };
      // O zoom anda numa escala bem menor que as coordenadas; a mola dele
      // trabalha em passos de mil pra parar no mesmo momento que as outras.
      let molaZ: Mola = { valor: camRef.current.z * 1000, velocidade: 0 };
      const alvoZ = alvo.z * 1000;
      let anterior: number | null = null;

      const passo = (agora: number) => {
        const dt = anterior === null ? 1 / 60 : (agora - anterior) / 1000;
        anterior = agora;
        molaX = passoDaMola(molaX, alvo.x, dt, 0.4);
        molaY = passoDaMola(molaY, alvo.y, dt, 0.4);
        molaZ = passoDaMola(molaZ, alvoZ, dt, 0.4);
        camRef.current = {
          x: molaX.valor,
          y: molaY.valor,
          z: molaZ.valor / 1000,
        };
        pintar();

        if (
          molaParada(molaX, alvo.x) &&
          molaParada(molaY, alvo.y) &&
          molaParada(molaZ, alvoZ)
        ) {
          camRef.current = alvo;
          camAnimRef.current = null;
          pintar();
          return;
        }
        camAnimRef.current = requestAnimationFrame(passo);
      };
      camAnimRef.current = requestAnimationFrame(passo);
    },
    [pintar],
  );

  /**
   * Leva a vista até a camada escolhida, deixando-a no meio da faixa de palco
   * que o painel não cobre. Sem painel aberto, a vista volta pro lugar.
   */
  const acomodarVista = useCallback(
    (id: string | null) => {
      const palco = stageRef.current;
      if (!palco) return;

      const camada = camadasRef.current.find((l) => l.id === id);
      const z = camRef.current.z;
      let alvo: Vista = { x: 0, y: 0, z };

      if (camada) {
        const caixaPalco = palco.getBoundingClientRect();
        const topoDoPainel =
          painelRef.current?.getBoundingClientRect().top ?? window.innerHeight;
        // A faixa que sobra entre o topo do palco e o que o painel cobre.
        const visivel = Math.max(
          caixaPalco.height * 0.25,
          Math.min(caixaPalco.bottom, topoDoPainel) - caixaPalco.top,
        );
        const meioVisivelEmPalco =
          (visivel / 2 / caixaPalco.height) * alturaVisivelRef.current;

        alvo = {
          x: camada.x - STAGE.width / 2 / z,
          y: camada.y - meioVisivelEmPalco / z,
          z,
        };
      }

      animarVista(alvo);
    },
    [animarVista],
  );

  /**
   * Traz de volta o que está desenhado, mesmo que a peça tenha sido arrastada
   * pra fora da vista. Sem zoom: a vista vai até o meio do conteúdo, que é o
   * enquadramento possível num palco de tamanho fixo.
   */
  const centralizar = useCallback(() => {
    const caixas = camadasRef.current
      .map((l) => {
        const size = medidasRef.current.get(l.id);
        return size ? layerCorners(l, size) : null;
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    const conteudo = unionBounds(caixas);
    if (!conteudo) {
      animarVista({ x: 0, y: 0, z: 1 });
      return;
    }

    // Enquadra o desenho inteiro com uma folga em volta, sem passar do zoom
    // que o palco aceita.
    const largura = Math.max(1, conteudo.right - conteudo.left);
    const altura = Math.max(1, conteudo.bottom - conteudo.top);
    const z = clamp(
      Math.min(STAGE.width / largura, alturaVisivelRef.current / altura) * 0.85,
      ZOOM_MIN,
      ZOOM_MAX,
    );

    animarVista({
      x: (conteudo.left + conteudo.right) / 2 - STAGE.width / 2 / z,
      y: (conteudo.top + conteudo.bottom) / 2 - alturaVisivelRef.current / 2 / z,
      z,
    });
  }, [animarVista]);

  /**
   * Na abertura a vista enquadra o que está desenhado. O palco é maior que a
   * janela em quase toda tela, e começar no canto dele deixaria a peça fora de
   * vista sem motivo.
   */
  useEffect(() => {
    if (jaEnquadrouRef.current || sizes.size === 0) return;
    jaEnquadrouRef.current = true;
    centralizar();
  }, [sizes, centralizar]);

  /**
   * Abrir uma ferramenta acomoda a vista na camada escolhida; fechar devolve o
   * palco inteiro. Trocar de camada com o painel aberto também acompanha.
   */
  useEffect(() => {
    acomodarVista(dock ? selectedId : null);
  }, [dock, selectedId, acomodarVista]);

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
      const alvo = e.target as HTMLElement | null;
      // Dentro de um campo o teclado é do texto que está sendo digitado.
      if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return;

      const comando = e.metaKey || e.ctrlKey;

      if (comando && e.key.toLowerCase() === "z") {
        e.preventDefault();
        setHistory((h) => (e.shiftKey ? refazer(h) : desfazer(h)));
        return;
      }

      const escolhida = selecaoRef.current;
      if (!escolhida) return;

      if (comando && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicarRef.current(escolhida);
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removerRef.current(escolhida);
        return;
      }

      const passos: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const passo = passos[e.key];
      if (!passo) return;

      e.preventDefault();
      // Shift anda em salto; sozinha, a seta ajusta fino.
      const distancia = e.shiftKey ? 20 : 2;
      const camada = camadasRef.current.find((l) => l.id === escolhida);
      if (!camada) return;
      despacharAcao({
        type: "alterar",
        id: escolhida,
        patch: {
          x: camada.x + passo[0] * distancia,
          y: camada.y + passo[1] * distancia,
        },
        coalesce: `teclado:${escolhida}`,
      });
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [despacharAcao]);

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
   * Qual camada o toque escolhe: a de cima cujo desenho está sob o dedo.
   *
   * A tolerância em volta do ponto existe pra letra fina não exigir mira. E
   * não há mais volta pra caixa quando nada é acertado: no vazio o toque passa
   * a arrastar o palco, e a caixa — que é enorme numa frase larga — roubaria
   * esse gesto em quase toda a tela.
   */
  const camadaNoPonto = useCallback(
    (ponto: Point) => {
      const folga = (STAGE.width * 0.012) / camRef.current.z;
      const vizinhos: Point[] = [
        ponto,
        { x: ponto.x - folga, y: ponto.y },
        { x: ponto.x + folga, y: ponto.y },
        { x: ponto.x, y: ponto.y - folga },
        { x: ponto.x, y: ponto.y + folga },
      ];

      for (let i = camadasRef.current.length - 1; i >= 0; i--) {
        const l = camadasRef.current[i];
        if (l.hidden) continue;
        const size = medidasRef.current.get(l.id);
        if (!size) continue;
        if (!vizinhos.some((v) => hitsLayer(v, l, size))) continue;
        if (vizinhos.some((v) => acertaODesenho(l, v))) return l;
      }
      return null;
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
      const r = snap(
        { x, y },
        size,
        outrasCaixas(id),
        STAGE,
        STAGE.width * 0.012,
      );
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
      // gesto ficaria pendente até a pessoa voltar pro app. Quem pediu menos
      // movimento no sistema também não quer ver a peça deslizando sozinha —
      // nos dois casos ela vai direto pro destino e o passo é gravado.
      if (document.hidden || semMovimento()) {
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
        dedosNaTelaRef.current.clear();
        dragRef.current = null;
        navRef.current = null;
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
  function stagePoint(e: React.PointerEvent | PointerEvent): Point {
    return pontoDoPalco(e.clientX, e.clientY);
  }

  /**
   * Liga o gesto do palco a ouvintes do próprio navegador, e não aos do React.
   *
   * O botão de mover já fazia assim e era visivelmente mais leve que arrastar
   * direto no palco. O caminho do React passa por delegação e reconciliação
   * antes de chegar aqui; num gesto contínuo isso é uma volta inteira por
   * evento, e no celular a mão sente.
   */
  const ouvindoRef = useRef(false);

  const ligarGestoNativo = useCallback(() => {
    if (ouvindoRef.current) return;
    ouvindoRef.current = true;

    const mover = (ev: PointerEvent) => tratarMovimento(ev);
    const soltar = (ev: PointerEvent) => {
      tratarFim(ev);
      if (pointersRef.current.size === 0) {
        ouvindoRef.current = false;
        window.removeEventListener("pointermove", mover);
        window.removeEventListener("pointerup", soltar);
        window.removeEventListener("pointercancel", soltar);
      }
    };

    window.addEventListener("pointermove", mover, { passive: true });
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * O ponto do palco de volta pra medida da tela, sem o zoom aplicado. É com
   * ele que a vista é recalculada pra manter algo parado sob o dedo.
   */
  const localDoPalco = useCallback((ponto: Point): Point => {
    const { x, y, z } = camRef.current;
    return { x: (ponto.x - x) * z, y: (ponto.y - y) * z };
  }, []);

  /** Ponto do dedo na medida da tela, em unidades de palco e sem zoom. */
  const localDaTela = useCallback((clientX: number, clientY: number): Point => {
    const rect =
      caixaDoPalcoRef.current ?? stageRef.current!.getBoundingClientRect();
    // A mesma escala nos dois eixos: a janela não tem mais a proporção do
    // palco, e usar a altura dela aqui deformaria o gesto.
    const porUnidade = rect.width / STAGE.width;
    return {
      x: (clientX - rect.left) / porUnidade,
      y: (clientY - rect.top) / porUnidade,
    };
  }, []);

  /** Da tela pro palco, já somando o quanto a vista está deslocada. */
  const pontoDoPalco = useCallback((clientX: number, clientY: number): Point => {
    const rect =
      caixaDoPalcoRef.current ?? stageRef.current!.getBoundingClientRect();
    const { x, y, z } = camRef.current;
    const porUnidade = rect.width / STAGE.width;
    return {
      x: (clientX - rect.left) / porUnidade / z + x,
      y: (clientY - rect.top) / porUnidade / z + y,
    };
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    // Uma animação em curso é interrompida pelo toque: quem manda é o dedo.
    if (animacaoRef.current !== null) {
      cancelAnimationFrame(animacaoRef.current);
      animacaoRef.current = null;
      encerrarComCommit();
    }
    // A vista também para. Continuar deslizando durante o arrasto faria a peça
    // escapar do dedo, porque o chão estaria andando embaixo dela.
    if (camAnimRef.current !== null) {
      cancelAnimationFrame(camAnimRef.current);
      camAnimRef.current = null;
    }
    amostrasRef.current = { x: [], y: [] };
    amostrasDaVistaRef.current = { x: [], y: [] };
    // Encostar no palco fecha os ajustes: eles cobrem justamente o canto onde
    // a peça costuma estar.
    setAjustes(false);

    const point = stagePoint(e);
    pointersRef.current.set(e.pointerId, point);
    dedosNaTelaRef.current.set(e.pointerId, localDaTela(e.clientX, e.clientY));
    inicioRef.current = {
      ponto: { x: e.clientX, y: e.clientY },
      // Dois dedos já são intenção declarada: a pinça não espera folga.
      armado: pointersRef.current.size > 1,
    };

    const dedos = [...pointersRef.current.values()];
    const naTela = [...dedosNaTelaRef.current.values()];
    if (dedos.length === 2) {
      // Dois dedos aproximam e afastam a vista. O que está sob os dedos fica
      // parado enquanto o zoom muda — é o que faz a pinça parecer que pega o
      // desenho, e não a tela.
      dragRef.current = null;
      const meio = {
        x: (dedos[0].x + dedos[1].x) / 2,
        y: (dedos[0].y + dedos[1].y) / 2,
      };
      navRef.current = {
        modo: "lente",
        ancora: meio,
        ancoraLocal: localDoPalco(meio),
        distancia: Math.max(1, distance(naTela[0], naTela[1])),
        zoom: camRef.current.z,
      };
      // Guardado pra reconhecer o toque de dois dedos, que é desfazer.
      doisDedosRef.current = { t: e.timeStamp, moveu: false };
      ligarGestoNativo();
      return;
    }

    const alvo = camadaNoPonto(point);

    // Dois toques na peça abrem o texto dela. Escrever é o que mais se faz
    // aqui, e era o caminho mais longo da tela.
    //
    // O segundo toque precisa cair quase no mesmo lugar do primeiro: tocar pra
    // escolher e tocar de novo pra arrastar são dois toques seguidos na mesma
    // camada, e sem a distância isso abria o painel sozinho o tempo todo.
    const agora = e.timeStamp;
    const anterior = toqueRef.current;
    toqueRef.current = { id: alvo?.id ?? null, t: agora, ponto: point };
    const pertoDoAnterior =
      anterior && distance(anterior.ponto, point) < STAGE.width * 0.03;
    if (
      alvo &&
      anterior &&
      anterior.id === alvo.id &&
      pertoDoAnterior &&
      agora - anterior.t < 300
    ) {
      setSelectedId(alvo.id);
      setDock("texto");
      requestAnimationFrame(() => {
        const campo = document.getElementById("lettering-text");
        if (campo instanceof HTMLTextAreaElement) {
          campo.focus();
          campo.select();
        }
      });
      return;
    }

    setSelectedId(alvo?.id ?? null);

    if (!alvo) {
      // Dedo no vazio arrasta o palco. Antes o gesto morria aqui: o toque só
      // desmarcava a camada e não havia como andar pela peça.
      navRef.current = {
        modo: "mover",
        ancora: point,
        ancoraLocal: localDoPalco(point),
        distancia: 1,
        zoom: camRef.current.z,
      };
      ligarGestoNativo();
      return;
    }

    dragRef.current = {
      id: alvo.id,
      dx: point.x - alvo.x,
      dy: point.y - alvo.y,
    };

    // A moldura aparece no dedo descendo, não depois que o estado chega. É
    // pouco tempo, mas é onde a sensação de comando direto se decide — e o
    // laço de pintura já sabe tudo que precisa.
    selecaoRef.current = alvo.id;
    pintar();

    ligarGestoNativo();
  }

  /**
   * Puxar a alça: a distância até o centro vira tamanho, o ângulo vira giro.
   *
   * O gesto é acompanhado no window, não no próprio botão. Esperar o
   * "pointerup" chegar na alça deixava o giro preso quando o evento se perdia
   * — e só soltava ao tocar em outro lugar da tela.
   */
  function onAlcaDown(
    e: React.PointerEvent,
    faz: { escala?: boolean; giro?: boolean } = { escala: true, giro: true },
  ) {
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
      if (!stageRef.current) return;
      const point = pontoDoPalco(ev.clientX, ev.clientY);
      const escala = distance(centro, point) / base.distancia;
      const giro = shortestTurn(base.angulo, angle(centro, point));
      // Canto muda tamanho, alça de cima gira. Separado porque cada gesto tem
      // sua intenção: ajustar o corpo da letra sem torcer a peça, e vice-versa.
      vivoRef.current = {
        id: base.id,
        ...(faz.escala
          ? { size: Math.round(clamp(base.size * escala, 8, 900)) }
          : {}),
        ...(faz.giro
          ? { rotation: Math.round(clamp(base.rotation + giro, -180, 180)) }
          : {}),
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
      if (!stageRef.current) return;
      const ponto = pontoDoPalco(ev.clientX, ev.clientY);
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

  function tratarMovimento(e: PointerEvent) {
    if (!pointersRef.current.has(e.pointerId)) return;

    const inicio = inicioRef.current;
    if (inicio && !inicio.armado) {
      const andou = distance(inicio.ponto, { x: e.clientX, y: e.clientY });
      if (andou < FOLGA_DO_ARRASTO) return;

      inicio.armado = true;
      if (doisDedosRef.current) doisDedosRef.current.moveu = true;
      // O gesto recomeça daqui: sem recolocar a âncora, a peça daria um pulo
      // do tamanho da folga no primeiro quadro.
      const agora = stagePoint(e);
      const drag = dragRef.current;
      const nav = navRef.current;
      if (drag) {
        const camada = camadasRef.current.find((l) => l.id === drag.id);
        if (camada) {
          drag.dx = agora.x - camada.x;
          drag.dy = agora.y - camada.y;
        }
      } else if (nav) {
        nav.ancora = agora;
      }
      amostrasRef.current = { x: [], y: [] };
    }

    pointersRef.current.set(e.pointerId, stagePoint(e));
    dedosNaTelaRef.current.set(e.pointerId, localDaTela(e.clientX, e.clientY));
    const naTela = [...dedosNaTelaRef.current.values()];

    const nav = navRef.current;
    if (nav) {
      if (nav.modo === "lente" && naTela.length >= 2) {
        const meioLocal = {
          x: (naTela[0].x + naTela[1].x) / 2,
          y: (naTela[0].y + naTela[1].y) / 2,
        };
        // Fora dos limites o dedo continua andando e a lente responde cada
        // vez menos, em vez de congelar. Ao soltar, a vista volta pro limite.
        const cru = (nav.zoom * distance(naTela[0], naTela[1])) / nav.distancia;
        const z =
          cru > ZOOM_MAX
            ? ZOOM_MAX + resistencia(cru - ZOOM_MAX, ZOOM_MAX)
            : cru < ZOOM_MIN
              ? ZOOM_MIN - resistencia(ZOOM_MIN - cru, ZOOM_MIN)
              : cru;
        // A âncora precisa continuar caindo no mesmo lugar da tela.
        camRef.current = {
          z,
          x: nav.ancora.x - meioLocal.x / z,
          y: nav.ancora.y - meioLocal.y / z,
        };
        // Uma pintura por quadro. O iPhone entrega vários toques no mesmo
        // quadro, e pintar em cada um era desenhar pro lixo.
        agendarPintura();
        return;
      }

      if (nav.modo === "mover" && naTela.length === 1) {
        const local = naTela[0];
        camRef.current = {
          ...camRef.current,
          x: nav.ancora.x - local.x / camRef.current.z,
          y: nav.ancora.y - local.y / camRef.current.z,
        };
        const t = e.timeStamp;
        amostrasDaVistaRef.current.x.push({ valor: camRef.current.x, t });
        amostrasDaVistaRef.current.y.push({ valor: camRef.current.y, t });
        if (amostrasDaVistaRef.current.x.length > 12) {
          amostrasDaVistaRef.current.x.shift();
          amostrasDaVistaRef.current.y.shift();
        }
        agendarPintura();
        return;
      }
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

  function tratarFim(e: PointerEvent) {
    const doisDedos = doisDedosRef.current;
    if (doisDedos && !doisDedos.moveu && e.timeStamp - doisDedos.t < 400) {
      doisDedosRef.current = null;
      pointersRef.current.clear();
      dedosNaTelaRef.current.clear();
      navRef.current = null;
      inicioRef.current = null;
      setHistory(desfazer);
      vibrar(10);
      return;
    }
    if (doisDedos) doisDedosRef.current = null;

    const arrastava = dragRef.current;
    pointersRef.current.delete(e.pointerId);
    dedosNaTelaRef.current.delete(e.pointerId);
    const dedos = [...pointersRef.current.values()];

    if (dedos.length === 0) {
      // A vista sai como a peça sai: continuando o movimento que o dedo deu.
      // Parar seco aqui e deslizar na peça eram duas físicas pro mesmo gesto.
      const forcado = clamp(camRef.current.z, ZOOM_MIN, ZOOM_MAX);
      if (navRef.current?.modo === "lente" && forcado !== camRef.current.z) {
        // Passou do limite durante o gesto: agora volta.
        animarVista({ ...camRef.current, z: forcado });
      } else if (navRef.current?.modo === "mover") {
        const vx = velocidade(amostrasDaVistaRef.current.x);
        const vy = velocidade(amostrasDaVistaRef.current.y);
        if (Math.abs(vx) > 40 || Math.abs(vy) > 40) {
          animarVista({
            ...camRef.current,
            x: camRef.current.x + projetar(vx),
            y: camRef.current.y + projetar(vy),
          });
        }
      }
      amostrasDaVistaRef.current = { x: [], y: [] };
      navRef.current = null;
      inicioRef.current = null;
    }
    else if (navRef.current?.modo === "lente" && dedos.length < 2) {
      navRef.current = null;
    }

    if (dedos.length === 0 && vivoRef.current) {
      // Arrastar termina com inércia; escalar e girar param onde pararam.
      if (arrastava) soltarComInercia(arrastava.id);
      else encerrarComCommit();
    }

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
      .filter((l) => !l.hidden)
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
    // A escala pedida ainda passa pelo teto do aparelho: no iPhone um canvas
    // grande demais volta em branco, sem erro nenhum.
    const escala = safeScale(width, height, qualidade);
    canvas.width = Math.ceil(width * escala);
    canvas.height = Math.ceil(height * escala);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(escala, escala);
    ctx.translate(-area.left, -area.top);

    layers.forEach((layer) => {
      // O que está apagado na tela não pode aparecer no arquivo.
      if (layer.hidden) return;
      ctx.save();
      ctx.translate(layer.x, layer.y);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      drawLayer(ctx, layer);
      ctx.restore();
    });

    setPng({
      url: canvas.toDataURL("image/png"),
      largura: canvas.width,
      altura: canvas.height,
    });

    // O arquivo é preparado junto, e não no toque de compartilhar: o iOS só
    // abre a folha do sistema no gesto da pessoa, e um await no meio do
    // caminho faz ele considerar que o gesto já passou.
    canvas.toBlob((blob) => {
      arquivoRef.current = blob
        ? new File([blob], "lettering.png", { type: "image/png" })
        : null;
    }, "image/png");
  }

  /** Entrega o PNG pra folha de compartilhamento do sistema. */
  async function compartilhar() {
    const file = arquivoRef.current;
    if (!file) return;
    try {
      await navigator.share({ files: [file] });
    } catch (erro) {
      // Cancelar a folha não é falha; qualquer outra coisa vira recado.
      if ((erro as Error)?.name !== "AbortError") {
        setAviso({ texto: "Não deu pra abrir o compartilhamento." });
      }
    }
  }

  function adicionar(layer: Layer) {
    despacharAcao({ type: "adicionar", layer });
    setDock("texto");
  }

  function duplicar(id: string) {
    despacharAcao({
      type: "duplicar",
      id,
      novoId: novaCamada().id,
      // Um deslocamento visível o bastante pra perceber que são duas peças.
      desloca: 32,
    });
  }

  function remover(id: string) {
    const alvo = layers.find((l) => l.id === id);
    despacharAcao({ type: "remover", id });
    // Apagar não pede confirmação: pede volta. O aviso some sozinho, e até lá
    // um toque devolve a camada inteira, com estilo e posição.
    setAviso({
      texto: `"${(alvo?.text ?? "").split("\n")[0] || "camada"}" removida`,
      comDesfazer: true,
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

  /**
   * Registra no navegador uma fonte que veio da biblioteca. O arquivo é
   * buscado da rota do app, que exige sessão — o bucket é privado.
   */
  const registrarFonte = useCallback(
    async (fonte: FonteSalva) => {
      const familia = `"${fonte.family}"`;
      if (fonts.some((f) => f.family === familia)) return familia;
      try {
        const bytes = await fetch(
          `/api/lettering/fontes/${encodeURIComponent(fonte.family)}`,
        ).then((r) => r.arrayBuffer());
        const face = new FontFace(fonte.family, bytes);
        await face.load();
        document.fonts.add(face);
        esqueceMedidas();
        setFonts((atual) => [
          ...atual,
          { family: familia, label: fonte.label },
        ]);
        return familia;
      } catch {
        setAviso({ texto: `Não deu pra carregar a fonte ${fonte.label}.` });
        return null;
      }
    },
    [fonts],
  );

  async function salvarNaBiblioteca() {
    const nome = nomeDoLayout.trim();
    if (!nome || ocupado) return;
    setOcupado(true);
    try {
      // O que vai pro banco é o mesmo formato do rascunho, com carimbo de
      // versão: sem ele a validação recusa o layout na volta.
      const lista = await guardarLayoutAction(
        nome,
        paraGuardar(history.presente),
      );
      setLayouts(lista);
      setNomeDoLayout("");
      setAviso({ texto: `"${nome}" salvo na biblioteca` });
    } catch {
      setAviso({ texto: "Não deu pra salvar na biblioteca." });
    } finally {
      setOcupado(false);
    }
  }

  /**
   * Abrir um layout salvo troca tudo que está na tela — e por isso entra no
   * histórico: um toque errado aqui tem que ter volta.
   */
  async function abrirLayout(layout: LayoutSalvo) {
    const estado = validarLayout(layout.data);
    if (!estado) {
      setAviso({ texto: "Esse layout foi salvo num formato antigo." });
      return;
    }

    // As fontes do layout são registradas antes do desenho, senão a peça
    // aparece por um instante com a fonte de reserva.
    await Promise.all(
      fontesSalvas
        .filter((f) => estado.layers.some((l) => l.family === `"${f.family}"`))
        .map(registrarFonte),
    );

    despacharAcao({ type: "trocarTudo", state: estado });
    fecharPasso();
    setDock(null);
  }

  async function apagarLayout(id: string, nome: string) {
    if (ocupado) return;
    setOcupado(true);
    try {
      setLayouts(await excluirLayoutAction(id));
      setAviso({ texto: `"${nome}" saiu da biblioteca` });
    } catch {
      setAviso({ texto: "Não deu pra excluir." });
    } finally {
      setOcupado(false);
    }
  }

  async function loadFont(file: File) {
    setFontError(null);
    const label = file.name.replace(/\.[^.]+$/, "");
    const custom = `lettering-${label.replace(/[^a-zA-Z0-9]/g, "-")}-${Date.now()}`;
    try {
      const face = new FontFace(custom, await file.arrayBuffer());
      await face.load();
      document.fonts.add(face);
      // O mesmo texto passa a ter outra forma: o que foi medido antes vira
      // mentira.
      esqueceMedidas();
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


  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 pb-44 lg:max-w-2xl">
      {/* O palco é a peça: no celular ele fica no topo e gruda, pra editar
          vendo o resultado sem precisar rolar a página. */}
      <div className="relative sticky top-0 z-10 -mx-4 bg-neutral-50 px-4 py-2 lg:static lg:mx-0 lg:bg-transparent lg:p-0">
        <div
          ref={stageRef}
          onPointerDown={onPointerDown}
          className="relative h-[58svh] w-full touch-none select-none lg:h-[70svh]"
        >
          {/* O recorte fica só em volta do desenho. Estava no palco inteiro, e
              levava junto as alças da camada encostada na borda — some a alça,
              some o único jeito de girar aquela peça. */}
          <div
            style={{ background: FUNDOS[fundo] }}
            className="absolute inset-0 overflow-hidden rounded-lg border border-neutral-200"
          >
            <canvas
              ref={stageCanvasRef}
              width={STAGE.width}
              height={STAGE.height}
              className="size-full"
            />
          </div>

          {/* A alça mora num canto do palco, não em cima da camada. No canto
              da moldura ela cobria justamente a área que se quer arrastar — e
              sumia da tela quando a camada passava da borda. */}
          {/* Moldura da camada escolhida. Fica sempre montada e é o laço de
              pintura que a posiciona e a esconde — remontar isso a cada quadro
              custaria um render por movimento do dedo. */}
          <div
            ref={molduraRef}
            hidden
            // Ancorada no canto: quem posiciona é a transformação, e o
            // navegador sabe compor isso sem refazer a página.
            style={{ left: 0, top: 0, willChange: "transform" }}
            className="pointer-events-none absolute border-2 border-dashed border-neutral-900/70"
          >
            {/* Cantos mudam o tamanho. A área de toque é maior que o desenho:
                44px é o mínimo que o dedo acerta sem mira. */}
            {/* Centradas no canto, metade pra dentro. Inteiras pra fora, a peça
                encostada na borda direita jogava a alça pra fora da tela —
                visível, mas impossível de tocar. */}
            {(
              [
                [
                  "top-0 left-0 -translate-x-1/2 -translate-y-1/2",
                  "Aumentar pelo canto superior esquerdo",
                ],
                [
                  "top-0 right-0 translate-x-1/2 -translate-y-1/2",
                  "Aumentar pelo canto superior direito",
                ],
                [
                  "bottom-0 left-0 -translate-x-1/2 translate-y-1/2",
                  "Aumentar pelo canto inferior esquerdo",
                ],
                [
                  "bottom-0 right-0 translate-x-1/2 translate-y-1/2",
                  "Aumentar pelo canto inferior direito",
                ],
              ] as const
            ).map(([posicao, rotulo]) => (
              <button
                key={posicao}
                type="button"
                aria-label={rotulo}
                onPointerDown={(e) => onAlcaDown(e, { escala: true })}
                className={`pointer-events-auto absolute ${posicao} grid size-10 touch-none place-items-center`}
              >
                <span className="block size-3.5 rounded-full border-2 border-neutral-900 bg-white shadow-sm" />
              </button>
            ))}

            {/* A de girar fica afastada do corpo, acima: perto dos cantos ela
                seria pega por engano. */}
            <button
              type="button"
              aria-label="Girar a camada"
              onPointerDown={(e) => onAlcaDown(e, { giro: true })}
              className="pointer-events-auto absolute -top-14 left-1/2 grid size-11 -translate-x-1/2 touch-none place-items-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-md"
            >
              <RotateCw aria-hidden="true" className="size-4" />
            </button>
          </div>

          {selected ? (
            <button
              type="button"
              aria-label="Mover a camada"
              onPointerDown={onMoverDown}
              className="absolute bottom-3 left-3 grid size-12 touch-none place-items-center rounded-full border border-neutral-200 bg-white/95 text-neutral-700 shadow-md transition-transform duration-100 active:scale-95 active:bg-neutral-100"
            >
              <Move aria-hidden="true" className="size-5" />
            </button>
          ) : null}
        </div>

          {/* Ajustes do palco num botão só: desfazer, refazer e sobre o que a
            peça está sendo vista. São controles da vista, não da peça — por
            isso ficam aqui e não na barra de ferramentas. */}
        <div className="absolute top-5 right-7 z-20">
          <button
            type="button"
            aria-label="Ajustes do palco"
            aria-expanded={ajustes}
            onClick={() => setAjustes((aberto) => !aberto)}
            className={`grid size-10 place-items-center rounded-full border shadow-md transition-transform duration-100 active:scale-95 ${
              ajustes
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 bg-white/95 text-neutral-700"
            }`}
          >
            <MoreHorizontal aria-hidden="true" className="size-5" />
          </button>

          {ajustes ? (
            <div className="absolute top-12 right-0 w-52 space-y-3 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg">
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="Desfazer"
                  disabled={!podeDesfazer(history)}
                  onClick={() => setHistory(desfazer)}
                  className="flex flex-1 items-center justify-center gap-1 rounded-md border border-neutral-200 py-2 text-sm text-neutral-700 transition-transform duration-100 active:scale-95 disabled:opacity-40"
                >
                  <Undo2 aria-hidden="true" className="size-4" />
                  Desfazer
                </button>
                <button
                  type="button"
                  aria-label="Refazer"
                  disabled={!podeRefazer(history)}
                  onClick={() => setHistory(refazer)}
                  className="grid w-11 place-items-center rounded-md border border-neutral-200 text-neutral-700 transition-transform duration-100 active:scale-95 disabled:opacity-40"
                >
                  <Redo2 aria-hidden="true" className="size-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  centralizar();
                  setAjustes(false);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-neutral-200 py-2 text-sm text-neutral-700 transition-transform duration-100 active:scale-95"
              >
                <Crosshair aria-hidden="true" className="size-4" />
                Centralizar
              </button>

              <div className="space-y-1">
                {(
                  [
                    ["Grade", grade, setGrade],
                    ["Encaixe", encaixe, setEncaixe],
                  ] as const
                ).map(([rotulo, ligado, alternar]) => (
                  <button
                    key={rotulo}
                    type="button"
                    role="switch"
                    aria-checked={ligado}
                    onClick={() => alternar((v) => !v)}
                    className="flex w-full items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-700 transition-transform duration-100 active:scale-95"
                  >
                    {rotulo}
                    <span
                      aria-hidden="true"
                      className={`h-5 w-9 rounded-full p-0.5 transition-colors ${
                        ligado ? "bg-neutral-900" : "bg-neutral-300"
                      }`}
                    >
                      <span
                        className={`block size-4 rounded-full bg-white transition-transform ${
                          ligado ? "translate-x-4" : ""
                        }`}
                      />
                    </span>
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-neutral-500">Ver a peça sobre</p>
                <div className="grid grid-cols-2 gap-1">
                  {(
                    [
                      ["xadrez", "Transparente"],
                      ["claro", "Claro"],
                      ["escuro", "Escuro"],
                      ["foto", "Foto"],
                    ] as const
                  ).map(([id, rotulo]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFundo(id)}
                      aria-pressed={fundo === id}
                      className={`rounded-md border px-2 py-2 text-xs transition-transform duration-100 active:scale-95 ${
                        fundo === id
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-200 bg-white text-neutral-600"
                      }`}
                    >
                      {rotulo}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {aviso ? (
          <div
            role="status"
            className="mt-2 flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 shadow-sm"
          >
            <span className="flex-1 truncate">{aviso.texto}</span>
            {aviso.comDesfazer ? (
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
            ) : null}
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
          Arraste a peça pra mover, o vazio pra andar pelo palco e dois dedos
          pra aproximar. Os cantos mudam o tamanho, a alça de cima gira, e dois
          toques abrem o texto.
        </p>
      </div>

      {/* A dock flutua sobre o conteúdo, descolada das bordas, e o painel da
          ferramenta sobe acima dela — um de cada vez, que é o que cabe no
          celular. Cor sólida em vez de vidro: aqui embaixo passa a peça, e
          material translúcido brigaria com ela. */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex flex-col items-center gap-2 px-3"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        {dock ? (
          <div
            id="lettering-painel"
            ref={painelRef}
            // Cartão próprio, com o mesmo raio da dock: sem uma borda visível o
            // painel se confundia com o palco e não dava pra ver onde um
            // acabava e o outro começava.
            className="pointer-events-auto max-h-[40svh] w-full max-w-md overflow-auto rounded-[28px] border border-neutral-200 bg-neutral-100 shadow-xl"
          >
            <div hidden={dock !== "emoji"} className="space-y-3 p-3">
              <Button
                className="w-full"
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
              >
                <Smile aria-hidden="true" data-icon="inline-start" />
                Novo emoji
              </Button>
              <div className="flex flex-wrap gap-1">
                {EMOJI_RAPIDOS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() =>
                      selected?.kind === "emoji"
                        ? patch({ text: emoji })
                        : adicionar(
                            novaCamada({
                              kind: "emoji",
                              text: emoji,
                              family: EMOJI_FAMILY,
                              size: 200,
                            }),
                          )
                    }
                    className="rounded border border-neutral-200 px-3 py-2 text-lg hover:bg-neutral-50"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* A lista vem de cima pra baixo como as camadas aparecem na
                peça: a primeira linha é a que fica na frente. */}
            <div hidden={dock !== "camadas"} className="p-2">
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
                        onAlternarVisivel={() =>
                          despacharAcao({
                            type: "alterar",
                            id: layer.id,
                            patch: { hidden: !layer.hidden },
                          })
                        }
                        onDuplicar={() => duplicar(layer.id)}
                        onRemover={() => remover(layer.id)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            </div>

            <div hidden={dock !== "alinhar"} className="space-y-3 p-3">
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

            <div hidden={dock !== "biblioteca"} className="space-y-4 p-3">
              <div className="space-y-1.5">
                <label className={LABEL} htmlFor="lettering-nome-layout">
                  Salvar esta peça
                </label>
                <div className="flex gap-2">
                  <input
                    id="lettering-nome-layout"
                    value={nomeDoLayout}
                    onChange={(e) => setNomeDoLayout(e.target.value)}
                    placeholder="Nome da peça"
                    className={INPUT}
                  />
                  <Button
                    onClick={salvarNaBiblioteca}
                    disabled={!nomeDoLayout.trim() || ocupado}
                  >
                    Salvar
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className={LABEL}>Peças salvas</p>
                {layouts.length === 0 ? (
                  <p className="text-sm text-neutral-500">
                    Nada salvo ainda. O que você salvar aqui volta em qualquer
                    aparelho.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {layouts.map((layout) => (
                      <li
                        key={layout.id}
                        className="flex items-center gap-1 rounded-md border border-neutral-200"
                      >
                        <button
                          type="button"
                          onClick={() => abrirLayout(layout)}
                          className="flex-1 truncate px-3 py-3 text-left text-sm"
                        >
                          {layout.name}
                        </button>
                        <button
                          type="button"
                          aria-label={`Excluir ${layout.name}`}
                          onClick={() => apagarLayout(layout.id, layout.name)}
                          className="p-3 text-neutral-500"
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-1.5 border-t border-neutral-200 pt-3">
                <p className={LABEL}>Fontes dos clientes</p>
                <p className="text-xs text-neutral-500">
                  Guardadas de vez: não precisa subir o arquivo de novo a cada
                  peça.
                </p>

                {fontesSalvas.length > 0 ? (
                  <ul className="space-y-1">
                    {fontesSalvas.map((fonte) => (
                      <li
                        key={fonte.id}
                        className="flex items-center gap-1 rounded-md border border-neutral-200"
                      >
                        <button
                          type="button"
                          onClick={async () => {
                            const familia = await registrarFonte(fonte);
                            if (familia) patch({ family: familia });
                          }}
                          className="flex-1 truncate px-3 py-3 text-left text-sm"
                        >
                          {fonte.label}
                          {fonte.client ? (
                            <span className="ml-2 text-xs text-neutral-500">
                              {fonte.client}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <form
                  action={async (formData: FormData) => {
                    setOcupado(true);
                    try {
                      setFontesSalvas(await guardarFonteAction(formData));
                      setAviso({ texto: "Fonte guardada na biblioteca" });
                    } catch {
                      setAviso({ texto: "Não deu pra guardar a fonte." });
                    } finally {
                      setOcupado(false);
                    }
                  }}
                  className="space-y-2 rounded-md border border-neutral-200 p-2"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      name="cliente"
                      placeholder="Cliente"
                      className={INPUT}
                    />
                    <input
                      name="rotulo"
                      placeholder="Nome da fonte"
                      required
                      className={INPUT}
                    />
                  </div>
                  <input
                    type="file"
                    name="arquivo"
                    required
                    accept="font/*,.ttf,.otf,.ttc,.woff,.woff2,.TTF,.OTF"
                    className="w-full text-sm text-neutral-600"
                  />
                  <Button type="submit" disabled={ocupado} className="w-full">
                    <Upload aria-hidden="true" data-icon="inline-start" />
                    Guardar fonte
                  </Button>
                </form>
              </div>
            </div>
            <div
              hidden={
                dock !== "texto" && dock !== "estilo" && dock !== "efeitos"
              }
              className="space-y-3 p-3"
            >
              {dock === "texto" ? (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => adicionar(novaCamada({ text: "Texto" }))}
                >
                  <Type aria-hidden="true" data-icon="inline-start" />
                  Novo texto
                </Button>
              ) : null}

              {selected ? (
                <div className="space-y-3">
                  {dock === "texto" ? (
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

                  {dock === "estilo" ? (
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
                        <label
                          className={LABEL}
                          htmlFor="lettering-line-height"
                        >
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

                  {dock === "efeitos" ? (
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
                                stroke: Math.max(
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
                            htmlFor="lettering-stroke-color"
                          >
                            Cor do contorno
                          </label>
                          <input
                            id="lettering-stroke-color"
                            type="color"
                            value={selected.strokeColor}
                            onChange={(e) =>
                              patch({ strokeColor: e.target.value })
                            }
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
                            <label
                              className={LABEL}
                              htmlFor="lettering-shadow-x"
                            >
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
                            <label
                              className={LABEL}
                              htmlFor="lettering-shadow-y"
                            >
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
                            <label
                              className={LABEL}
                              htmlFor="lettering-box-color"
                            >
                              Cor do fundo
                            </label>
                            <input
                              id="lettering-box-color"
                              type="color"
                              value={selected.boxColor}
                              onChange={(e) =>
                                patch({ boxColor: e.target.value })
                              }
                              className="h-11 w-full rounded-md border border-neutral-200 bg-white p-1"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label
                              className={LABEL}
                              htmlFor="lettering-box-radius"
                            >
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
              ) : (
                <p className="p-1 text-sm text-neutral-500">
                  Toque numa camada no palco ou em Camadas pra editar.
                </p>
              )}
            </div>

            <div hidden={dock !== "exportar"} className="space-y-2 p-3">
              <label className="flex cursor-pointer items-center gap-2 py-1 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={trim}
                  onChange={(e) => setTrim(e.target.checked)}
                  className="size-5 accent-neutral-900"
                />
                Cortar no conteúdo (figurinha)
              </label>

              <div className="space-y-1.5">
                <label className={LABEL} htmlFor="lettering-qualidade">
                  Tamanho do arquivo
                </label>
                <select
                  id="lettering-qualidade"
                  value={qualidade}
                  onChange={(e) => setQualidade(Number(e.target.value))}
                  className={INPUT}
                >
                  <option value={EXPORT_SCALE}>
                    Máximo, pra usar de verdade
                  </option>
                  <option value={2}>Médio</option>
                  <option value={1}>Pequeno, só pra conferir</option>
                </select>
              </div>

              <Button size="lg" className="w-full" onClick={gerarPng}>
                <Download aria-hidden="true" data-icon="inline-start" />
                Exportar
              </Button>
            </div>
          </div>
        ) : null}

        <nav
          aria-label="Ferramentas"
          // Pílula sólida com sombra difusa, no espírito da dock do iOS 26: um
          // painel flutuante de cantos bem arredondados, separado das bordas.
          className="pointer-events-auto flex w-full max-w-md justify-between gap-0 rounded-[28px] border border-neutral-200 bg-white p-1.5 shadow-xl"
        >
          {(
            [
              ["texto", "Texto", Type],
              ["estilo", "Estilo", Palette],
              ["efeitos", "Efeitos", Sparkles],
              ["emoji", "Emoji", Smile],
              ["camadas", "Camadas", Layers],
              ["alinhar", "Alinhar", AlignCenter],
              ["biblioteca", "Biblioteca", BookMarked],
              ["exportar", "Exportar", Download],
            ] as const
          ).map(([id, rotulo, Icone]) => (
            <button
              key={id}
              type="button"
              onClick={() => setDock((atual) => (atual === id ? null : id))}
              aria-pressed={dock === id}
              aria-controls="lettering-painel"
              // O raio do item é concêntrico com o da dock: o interno é o
              // externo menos o respiro, senão os dois cantos brigam.
              aria-label={rotulo}
              // O raio do item é concêntrico com o da dock: o interno é o
              // externo menos o respiro, senão os dois cantos brigam.
              //
              // O nome aparece só na ferramenta aberta. Oito rótulos lado a
              // lado não cabem sem cortar palavra, e rótulo cortado não ajuda
              // ninguém — o da vez basta pra situar.
              className={`flex min-w-0 shrink-0 items-center gap-1.5 rounded-[22px] px-3 py-2.5 text-[11px] transition-all duration-200 active:scale-95 ${
                dock === id
                  ? "bg-neutral-900 text-white"
                  : "flex-1 justify-center text-neutral-600"
              }`}
            >
              <Icone aria-hidden="true" className="size-5 shrink-0" />
              {dock === id ? <span className="whitespace-nowrap">{rotulo}</span> : null}
            </button>
          ))}
        </nav>
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
              style={{ background: FUNDOS[fundo] }}
              className="grid flex-1 place-items-center rounded-md border border-neutral-200 p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={png.url}
                alt="Lettering pronto"
                className="max-h-[46svh] w-auto max-w-full"
              />
            </div>

            <p className="text-center text-xs text-neutral-500">
              {png.largura} × {png.altura} pixels
            </p>

            {podeCompartilhar ? (
              <>
                <Button size="lg" className="w-full" onClick={compartilhar}>
                  <Share2 aria-hidden="true" data-icon="inline-start" />
                  Salvar ou compartilhar
                </Button>
                <p className="text-sm text-neutral-600">
                  Abre a folha do sistema: &quot;Salvar em Fotos&quot; põe a
                  figurinha na galeria, pronta pro story.
                </p>
              </>
            ) : (
              <p className="text-sm text-neutral-600">
                No celular: segure o dedo na imagem e escolha &quot;Adicionar às
                Fotos&quot;. Depois é só usar o sticker de foto no story.
              </p>
            )}

            <Button
              render={<a href={png.url} download="lettering.png" />}
              // Baixar é um link com download, não um botão: sem isso o Base UI
              // avisa que as semânticas nativas de <button> se perdem.
              nativeButton={false}
              size="lg"
              variant={podeCompartilhar ? "secondary" : "default"}
              className="w-full"
            >
              <Download aria-hidden="true" data-icon="inline-start" />
              Baixar arquivo
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
  onAlternarVisivel,
  onDuplicar,
  onRemover,
}: {
  layer: Layer;
  selecionada: boolean;
  onSelecionar: () => void;
  onAlternarVisivel: () => void;
  onDuplicar: () => void;
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
          className={`flex-1 truncate py-3 pr-2 text-left text-sm ${
            layer.hidden ? "text-neutral-400 line-through" : ""
          }`}
        >
          {layer.text.split("\n")[0] || "(vazio)"}
        </button>
        <button
          type="button"
          aria-label={layer.hidden ? "Mostrar camada" : "Esconder camada"}
          aria-pressed={!layer.hidden}
          onClick={onAlternarVisivel}
          className="p-3 text-neutral-500"
        >
          {layer.hidden ? (
            <EyeOff aria-hidden="true" className="size-4" />
          ) : (
            <Eye aria-hidden="true" className="size-4" />
          )}
        </button>
        <button
          type="button"
          aria-label="Duplicar camada"
          onClick={onDuplicar}
          className="p-3 text-neutral-500"
        >
          <Copy aria-hidden="true" className="size-4" />
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
