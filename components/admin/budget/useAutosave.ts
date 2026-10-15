"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SalvarResultado = { ok: true } | { ok: false; motivo: string };

export type EstadoSave =
  | { tipo: "limpo" }
  | { tipo: "pendente" }
  | { tipo: "salvando" }
  | { tipo: "salvo" }
  | { tipo: "erro"; motivo: string };

type Rascunho<T> = { at: string; valor: T };

/**
 * Salvamento automático da proposta, no mesmo molde do editor de contratos:
 * grava uma pausa depois da última mudança, em fila (uma por vez e na ordem,
 * para uma resposta lenta nunca sobrescrever uma mais nova), tenta de novo
 * sozinho quando falha, grava ao esconder a aba e ao sair da tela, e guarda
 * uma cópia no navegador que só some quando o servidor confirma.
 *
 * `servidor` é o que o banco tem ao abrir a tela: serve só para decidir se a
 * cópia que sobrou de outra sessão é, de fato, algo que o banco não tem.
 */
export function useAutosave<T>({
  chave,
  servidor,
  salvar,
  atraso = 900,
}: {
  chave: string;
  servidor: T;
  salvar: (valor: T) => Promise<SalvarResultado>;
  atraso?: number;
}) {
  const [estado, setEstado] = useState<EstadoSave>({ tipo: "limpo" });
  const [rascunho, setRascunho] = useState<Rascunho<T> | null>(null);

  const salvarRef = useRef(salvar);
  useEffect(() => {
    salvarRef.current = salvar;
  }, [salvar]);

  // O que ainda não foi enviado. Fica em ref para o envio nunca ler uma
  // closure anterior à última tecla.
  const pendente = useRef<{ valor: T } | null>(null);
  const emVoo = useRef(0);
  const fila = useRef<Promise<unknown>>(Promise.resolve());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gravarRef = useRef<() => void>(() => {});

  const gravar = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const envio = pendente.current;
    if (!envio) return;
    pendente.current = null;
    emVoo.current += 1;
    setEstado({ tipo: "salvando" });

    fila.current = fila.current.then(async () => {
      let motivo: string | null = null;
      try {
        const r = await salvarRef.current(envio.valor);
        if (!r.ok) motivo = r.motivo;
      } catch {
        motivo = "Sem conexão com o servidor.";
      }
      emVoo.current -= 1;

      if (motivo !== null) {
        // Devolve ao pendente, a menos que algo mais novo já tenha chegado.
        pendente.current ??= envio;
        setEstado({ tipo: "erro", motivo });
        if (retry.current) clearTimeout(retry.current);
        retry.current = setTimeout(() => gravarRef.current(), 4000);
      } else if (pendente.current) {
        setEstado({ tipo: "pendente" });
      } else if (emVoo.current === 0) {
        try {
          localStorage.removeItem(chave);
        } catch {}
        setEstado({ tipo: "salvo" });
      }
    });
  }, [chave]);
  useEffect(() => {
    gravarRef.current = gravar;
  }, [gravar]);

  const agendar = useCallback(
    (valor: T, imediato = false) => {
      pendente.current = { valor };
      // Guarda já, a cada mudança: o servidor só recebe depois da pausa.
      try {
        const copia: Rascunho<T> = { at: new Date().toISOString(), valor };
        localStorage.setItem(chave, JSON.stringify(copia));
      } catch {}
      setEstado((e) => (e.tipo === "salvando" ? e : { tipo: "pendente" }));

      if (retry.current) clearTimeout(retry.current);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(gravar, imediato ? 0 : atraso);
    },
    [chave, atraso, gravar]
  );

  // Cópia que sobrou de uma sessão que não chegou a gravar no servidor.
  useEffect(() => {
    try {
      const bruto = localStorage.getItem(chave);
      if (!bruto) return;
      const copia = JSON.parse(bruto) as Rascunho<T>;
      if (JSON.stringify(copia.valor) === JSON.stringify(servidor)) {
        localStorage.removeItem(chave);
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRascunho(copia);
      }
    } catch {}
    // Só na abertura: depois disso a cópia é gravada, não lida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const descartarRascunho = useCallback(() => {
    try {
      localStorage.removeItem(chave);
    } catch {}
    setRascunho(null);
  }, [chave]);

  // Aba escondida ou trocada: grava já, sem esperar a pausa.
  useEffect(() => {
    const aoEsconder = () => {
      if (document.visibilityState === "hidden") gravar();
    };
    document.addEventListener("visibilitychange", aoEsconder);
    return () => document.removeEventListener("visibilitychange", aoEsconder);
  }, [gravar]);

  // Sair da tela com algo agendado: o envio sai de qualquer jeito (a action
  // continua no servidor), em vez de perder a última edição.
  useEffect(() => {
    return () => {
      if (retry.current) clearTimeout(retry.current);
      gravar();
    };
  }, [gravar]);

  // Fechar ou recarregar com algo ainda não gravado: o navegador pergunta.
  const naoGravado = estado.tipo !== "limpo" && estado.tipo !== "salvo";
  useEffect(() => {
    if (!naoGravado) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [naoGravado]);

  /** Há edição que o servidor ainda não confirmou: quem recebe props novas do
   *  servidor não pode sobrescrever o que está na tela por elas. */
  const ocupado = useCallback(
    () => pendente.current !== null || emVoo.current > 0,
    []
  );

  const fecharRascunho = useCallback(() => setRascunho(null), []);

  return {
    estado,
    agendar,
    ocupado,
    rascunho,
    descartarRascunho,
    fecharRascunho,
  };
}
