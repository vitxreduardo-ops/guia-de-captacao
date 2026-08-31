"use client";

import { Fragment, type SVGProps, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { submitBriefingAction } from "./actions";
import { stepsFor, telefoneValido } from "./fields";
import { TatuLogo } from "@/components/TatuLogo";

const INSTAGRAM = "@tatu.estudiocriativo";
const WHATSAPP_ESTUDIO = "5577999656195";

// Botão e chip selecionado usam ink sólido, não o verde-oliva puro da marca:
// texto creme sobre oliva mede 3,8:1, abaixo do 4,5:1 exigido pra texto. Ink
// é o mesmo tom escuro que a Tatú já usa no CTA da página de Orçamento.
const CTA = "bg-[var(--tatu-ink)] text-[var(--tatu-cream)]";
const HEADLINE = { fontFamily: "Bootzy, sans-serif" };

// Adaptado do Stepper da React Bits: círculo numerado, conector que preenche
// e check que se desenha — mas na paleta da Tatú, e alimentado pelo estado
// de passos que o formulário já mantém, não pela lógica própria do pacote
// (esta tela decide passo, validação e envio; o componente deles não sabe
// nada disso).
function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.1, type: "tween", ease: "easeOut", duration: 0.3 }}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function StepDots({
  total,
  current,
  onJump,
}: {
  total: number;
  current: number;
  onJump: (index: number) => void;
}) {
  return (
    <div className="flex items-center">
      {Array.from({ length: total }, (_, i) => {
        const status =
          i === current ? "active" : i < current ? "complete" : "inactive";
        return (
          <Fragment key={i}>
            <motion.button
              type="button"
              onClick={() => status !== "inactive" && i !== current && onJump(i)}
              disabled={status === "inactive"}
              animate={status}
              initial={false}
              variants={{
                inactive: { scale: 1 },
                active: { scale: 1.08 },
                complete: { scale: 1 },
              }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.25 }}
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                status === "inactive"
                  ? "border border-[var(--tatu-border)] text-[var(--tatu-muted)]"
                  : "bg-[var(--tatu-ink)] text-[var(--tatu-cream)]"
              } ${status !== "inactive" ? "cursor-pointer" : "cursor-default"}`}
            >
              {status === "complete" ? (
                <CheckIcon className="size-3.5" />
              ) : (
                i + 1
              )}
            </motion.button>
            {i < total - 1 && (
              <div className="mx-1 h-0.5 flex-1 overflow-hidden rounded-full bg-[var(--tatu-border)]">
                <motion.div
                  className="h-full bg-[var(--tatu-olive)]"
                  initial={false}
                  animate={{ width: i < current ? "100%" : "0%" }}
                  transition={{ type: "spring", bounce: 0, duration: 0.35 }}
                />
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function BriefingHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-10 flex justify-center bg-[var(--tatu-ink)]/95 px-6 py-4 backdrop-blur">
      <TatuLogo className="h-5 w-auto text-[var(--tatu-cream)]" />
    </header>
  );
}

function BriefingFooter() {
  return (
    <footer
      className="fixed inset-x-0 bottom-0 z-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-[var(--tatu-ink)]/95 px-6 py-3 text-xs text-[var(--tatu-cream)]/70 backdrop-blur"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <span className="font-medium text-[var(--tatu-cream)]">
        Tatú Estúdio Criativo
      </span>
      <a
        href={`https://instagram.com/${INSTAGRAM.slice(1)}`}
        target="_blank"
        rel="noreferrer"
        className="hover:text-[var(--tatu-cream)]"
      >
        {INSTAGRAM}
      </a>
      <a
        href={`https://wa.me/${WHATSAPP_ESTUDIO}`}
        target="_blank"
        rel="noreferrer"
        className="hover:text-[var(--tatu-cream)]"
      >
        WhatsApp
      </a>
    </footer>
  );
}

const INPUT =
  "w-full rounded-xl border border-[var(--tatu-border)] bg-white px-3.5 py-2.5 text-sm text-[var(--tatu-ink)] shadow-sm transition-colors outline-none focus:border-[var(--tatu-olive)] focus:ring-4 focus:ring-[var(--tatu-olive)]/10";

const ERROR_MESSAGES: Record<string, string> = {
  campos: "Faltou preencher algum campo obrigatório.",
  telefone: "Confira o WhatsApp: precisa ter DDD e 8 ou 9 dígitos.",
  servidor: "Não consegui salvar agora. Tenta de novo em instantes.",
};

export default function BriefingPage() {
  const prefersReducedMotion = useReducedMotion();
  const [rawStep, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [values, setValues] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Quantas perguntas da tela atual já apareceram: começa em 1 e cresce
  // conforme o cliente responde, pra tela nunca jogar tudo de uma vez.
  const [revealed, setRevealed] = useState(1);
  const [revealedStep, setRevealedStep] = useState(0);

  // Os passos dependem do serviço escolhido: quem pede site não responde as
  // perguntas de vídeo. Trocar o serviço encurta ou alonga o caminho, então o
  // passo atual é preso ao que existe agora.
  const steps = stepsFor(values);
  const step = Math.min(rawStep, steps.length - 1);
  const current = steps[step];
  const isLast = step === steps.length - 1;
  const missing = current.fields.filter(
    (f) => f.required && !(values[f.name] ?? "").trim(),
  );

  // O WhatsApp é o único caminho de volta pro cliente: número mal digitado
  // some sem ninguém dos dois lados perceber, então trava aqui.
  const contatoNoPasso = current.fields.some((f) => f.name === "contato");
  const contato = (values.contato ?? "").trim();
  const contatoRuim =
    contatoNoPasso && contato !== "" && !telefoneValido(contato);

  function isAnswered(name: string) {
    return (values[name] ?? "").trim() !== "";
  }

  // Quantos campos, em sequência a partir do primeiro, já têm resposta —
  // reabrir um passo já preenchido (ex.: apertando Voltar) mostra tudo que
  // já foi respondido, não só a primeira pergunta de novo.
  function leadingAnswered(fields: typeof current.fields) {
    let n = 0;
    while (n < fields.length && isAnswered(fields[n].name)) n++;
    return Math.min(n + 1, fields.length);
  }

  // Troca de passo (avançar ou voltar) reabre com tudo que já foi
  // respondido visível, não só a primeira pergunta — ajuste feito durante a
  // renderização, não em efeito, como o React recomenda pra resetar estado
  // quando uma prop (aqui, o passo) muda.
  if (revealedStep !== step) {
    setRevealedStep(step);
    setRevealed(leadingAnswered(current.fields));
  }

  const visibleFields = current.fields.slice(0, revealed);

  function set(name: string, value: string) {
    setValues((v) => ({ ...v, [name]: value }));
    setRevealed((r) => Math.max(r, leadingAnswered(current.fields) + 1));
  }

  // Só pra campo opcional: pula a pergunta sem respondê-la, revelando a
  // próxima mesmo assim. Campo obrigatório não tem esse botão.
  function skip() {
    setRevealed((r) => Math.min(r + 1, current.fields.length));
  }

  // Uma tela com uma única pergunta de escolha não precisa de um clique a
  // mais: escolher já é confirmar. Telas com mais de um campo continuam
  // exigindo o Continuar, porque aí a escolha ainda não é a resposta inteira.
  function setAndMaybeAdvance(name: string, value: string) {
    set(name, value);
    if (current.fields.length === 1) {
      setTimeout(() => advance(), 150);
    }
  }

  function advance() {
    if (contatoRuim) return;
    if (!isLast) {
      setDirection(1);
      setStep((s) => s + 1);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await submitBriefingAction(values);
      if (result.ok) setSent(true);
      else setError(result.error);
    });
  }

  function back() {
    setDirection(-1);
    setStep((s) => s - 1);
  }

  // Clicar num círculo já respondido pula direto pra ele — só pra trás; um
  // passo ainda não alcançado nem aceita clique (fica "inactive" no StepDots).
  function jump(index: number) {
    setDirection(index > step ? 1 : -1);
    setStep(index);
  }

  // Enter nos campos de uma linha avança. A submissão implícita do form não é
  // confiável em todo navegador, e textarea continua servindo pra quebrar
  // linha, então o atalho fica só nos inputs.
  function onEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    advance();
  }

  // Passo seguinte entra pela direita e sai pela esquerda; voltar espelha o
  // caminho ao contrário — o de onde veio é sempre por onde volta.
  const stepVariants = {
    enter: (dir: 1 | -1) => ({
      opacity: 0,
      x: prefersReducedMotion ? 0 : dir * 24,
    }),
    center: { opacity: 1, x: 0 },
    exit: (dir: 1 | -1) => ({
      opacity: 0,
      x: prefersReducedMotion ? 0 : -dir * 24,
    }),
  };
  const stepTransition = {
    type: "spring" as const,
    bounce: 0,
    duration: prefersReducedMotion ? 0.15 : 0.35,
  };

  if (sent) {
    return (
      <>
        <BriefingHeader />
        <main className="flex min-h-screen items-center justify-center bg-[var(--tatu-olive)] px-4 pt-20 pb-20">
          <motion.div
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={stepTransition}
            className="w-full max-w-md rounded-3xl border border-[var(--tatu-border)]/50 bg-white p-8 shadow-xl shadow-black/5 sm:p-10"
          >
            <h1 className="text-3xl text-[var(--tatu-ink)]" style={HEADLINE}>
              Briefing enviado
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--tatu-muted)]">
              Recebi tudo. Suas respostas ficam guardadas por 30 dias e são só
              minhas. Respondo no seu WhatsApp em até 1 dia útil.
            </p>
          </motion.div>
        </main>
        <BriefingFooter />
      </>
    );
  }

  return (
    <>
      <BriefingHeader />
      {/* Um cartão de verdade, não texto solto sobre o fundo: superfície
          branca com borda e sombra (§12 — materiais dão peso), altura
          travada e rolagem por dentro. Isso substitui o antigo "sticky
          bottom-20" da página — o rodapé de ações agora é parte do próprio
          cartão, sempre visível, sem depender de matemática de viewport. */}
      <main className="flex min-h-screen items-center justify-center bg-[var(--tatu-olive)] px-4 pt-20 pb-20">
        <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-3xl border border-[var(--tatu-border)]/50 bg-white shadow-xl shadow-black/5">
          <div className="px-6 pt-6 sm:px-8 sm:pt-8">
            {/* Antes da escolha do serviço o caminho ainda não existe: os
              círculos prometeriam um total que vai crescer de 3 pra 5. Até
              lá, só um marcador do passo atual. */}
            {values.servico ? (
              <StepDots total={steps.length} current={step} onJump={jump} />
            ) : (
              <div className="flex size-7 items-center justify-center rounded-full bg-[var(--tatu-ink)] text-xs font-semibold text-[var(--tatu-cream)]">
                {step + 1}
              </div>
            )}

            <p className="mt-4 text-xs font-medium tracking-wide text-[var(--tatu-muted)] uppercase">
              {values.servico
                ? `Passo ${step + 1} de ${steps.length}`
                : `Passo ${step + 1}`}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              advance();
            }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2 sm:px-8">
              <AnimatePresence mode="wait" custom={direction} initial={false}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={stepTransition}
                >
                  <h1
                    className="text-[2rem] leading-tight text-[var(--tatu-ink)]"
                    style={HEADLINE}
                  >
                    {current.title}
                  </h1>

                  <div className="mt-7 space-y-6">
                    {visibleFields.map((field, i) => (
                      <motion.div
                        key={field.name}
                        initial={{
                          opacity: 0,
                          y: prefersReducedMotion ? 0 : 12,
                        }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          type: "spring",
                          bounce: 0,
                          duration: prefersReducedMotion ? 0.15 : 0.35,
                        }}
                      >
                        <label
                          htmlFor={field.name}
                          className={
                            field.labelHidden
                              ? "sr-only"
                              : "mb-1 block text-sm font-medium text-[var(--tatu-ink)]"
                          }
                        >
                          {field.label}
                          {!field.required && (
                            <span className="ml-1 font-normal text-[var(--tatu-muted)]">
                              (opcional)
                            </span>
                          )}
                        </label>
                        {field.hint && (
                          <p className="mb-1.5 text-xs text-[var(--tatu-muted)]">
                            {field.hint}
                          </p>
                        )}

                        {field.type === "choice" ? (
                          <div className="flex flex-wrap gap-2">
                            {field.options?.map((option) => {
                              const active = values[field.name] === option;
                              return (
                                <motion.button
                                  key={option}
                                  type="button"
                                  whileTap={{ scale: 0.97 }}
                                  transition={{
                                    type: "spring",
                                    bounce: 0.3,
                                    duration: 0.15,
                                  }}
                                  onClick={() =>
                                    setAndMaybeAdvance(field.name, option)
                                  }
                                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                                    active
                                      ? `border-[var(--tatu-ink)] ${CTA}`
                                      : "border-[var(--tatu-border)] text-[var(--tatu-ink)] hover:border-[var(--tatu-olive)]"
                                  }`}
                                >
                                  {option}
                                </motion.button>
                              );
                            })}
                          </div>
                        ) : field.type === "textarea" ? (
                          <textarea
                            id={field.name}
                            rows={3}
                            value={values[field.name] ?? ""}
                            onChange={(e) => set(field.name, e.target.value)}
                            className={INPUT}
                          />
                        ) : field.type === "tel" ? (
                          <input
                            id={field.name}
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel-national"
                            onKeyDown={onEnter}
                            aria-invalid={contatoRuim || undefined}
                            aria-describedby={
                              contatoRuim ? "contato-erro" : undefined
                            }
                            value={values[field.name] ?? ""}
                            onChange={(e) => set(field.name, e.target.value)}
                            className={`${INPUT} ${contatoRuim ? "border-red-600 focus:border-red-600" : ""}`}
                          />
                        ) : (
                          <input
                            id={field.name}
                            type="text"
                            autoComplete={
                              field.name === "nome" ? "organization" : undefined
                            }
                            value={values[field.name] ?? ""}
                            onChange={(e) => set(field.name, e.target.value)}
                            className={INPUT}
                          />
                        )}

                        {field.name === "contato" && contatoRuim && (
                          <p
                            id="contato-erro"
                            className="mt-1.5 text-sm text-red-600"
                          >
                            Confira o número: precisa ter DDD e 8 ou 9 dígitos.
                          </p>
                        )}

                        {i === visibleFields.length - 1 &&
                          visibleFields.length < current.fields.length &&
                          !field.required &&
                          !isAnswered(field.name) && (
                            <button
                              type="button"
                              onClick={skip}
                              className="mt-1.5 text-sm text-[var(--tatu-muted)] underline-offset-2 transition-colors hover:text-[var(--tatu-ink)] hover:underline"
                            >
                              Pular essa
                            </button>
                          )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>

              {error && (
                <p className="mt-6 text-sm text-red-600">
                  {ERROR_MESSAGES[error] ?? "Algo deu errado. Tenta de novo."}
                </p>
              )}
            </div>

            {/* Rodapé do cartão, não da página: sempre visível porque é o
                próprio cartão que tem altura travada e rolagem por dentro —
                não depende de a tela caber na viewport. */}
            <div className="flex items-center gap-3 border-t border-[var(--tatu-border)]/70 px-6 py-4 sm:px-8">
              {step > 0 && (
                <button
                  type="button"
                  onClick={back}
                  disabled={pending}
                  className="rounded-md px-3 py-2 text-sm text-[var(--tatu-muted)] transition-colors hover:text-[var(--tatu-ink)] active:scale-[0.97] disabled:opacity-40"
                >
                  Voltar
                </button>
              )}
              <motion.button
                type="submit"
                disabled={missing.length > 0 || contatoRuim || pending}
                whileTap={
                  missing.length > 0 || contatoRuim || pending
                    ? undefined
                    : { scale: 0.97 }
                }
                transition={{ type: "spring", bounce: 0.3, duration: 0.15 }}
                className={`ml-auto rounded-xl px-5 py-2.5 text-sm font-medium shadow-sm disabled:opacity-40 ${CTA}`}
              >
                {pending
                  ? "Enviando…"
                  : isLast
                    ? "Enviar briefing"
                    : "Continuar"}
              </motion.button>
            </div>
          </form>
        </div>
      </main>
      <BriefingFooter />
    </>
  );
}
