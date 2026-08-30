"use client";

import { useState, useTransition } from "react";
import { submitBriefingAction } from "./actions";
import { stepsFor, telefoneValido } from "./fields";
import { TatuLogo } from "@/components/TatuLogo";

const INSTAGRAM = "@tatu.estudiocriativo";
const WHATSAPP_ESTUDIO = "5577999656195";

function BriefingHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-10 flex justify-center border-b border-neutral-200 bg-white/90 px-6 py-4 backdrop-blur">
      <TatuLogo className="h-5 w-auto text-neutral-900" />
    </header>
  );
}

function BriefingFooter() {
  return (
    <footer
      className="fixed inset-x-0 bottom-0 z-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-neutral-200 bg-white/90 px-6 py-3 text-xs text-neutral-500 backdrop-blur"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <span className="font-medium text-neutral-700">
        Tatú Estúdio Criativo
      </span>
      <a
        href={`https://instagram.com/${INSTAGRAM.slice(1)}`}
        target="_blank"
        rel="noreferrer"
        className="hover:text-neutral-900"
      >
        {INSTAGRAM}
      </a>
      <a
        href={`https://wa.me/${WHATSAPP_ESTUDIO}`}
        target="_blank"
        rel="noreferrer"
        className="hover:text-neutral-900"
      >
        WhatsApp
      </a>
    </footer>
  );
}

const INPUT =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 transition-colors focus:border-neutral-500 focus:outline-none";

const ERROR_MESSAGES: Record<string, string> = {
  campos: "Faltou preencher algum campo obrigatório.",
  telefone: "Confira o WhatsApp: precisa ter DDD e 8 ou 9 dígitos.",
  servidor: "Não consegui salvar agora. Tenta de novo em instantes.",
};

export default function BriefingPage() {
  const [rawStep, setStep] = useState(0);
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

  // Enter nos campos de uma linha avança. A submissão implícita do form não é
  // confiável em todo navegador, e textarea continua servindo pra quebrar
  // linha, então o atalho fica só nos inputs.
  function onEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    advance();
  }

  if (sent) {
    return (
      <>
        <BriefingHeader />
        <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 pt-24 pb-32">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Briefing enviado
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Recebi tudo. Suas respostas ficam guardadas por 30 dias e são só
            minhas. Respondo no seu WhatsApp em até 1 dia útil.
          </p>
        </main>
        <BriefingFooter />
      </>
    );
  }

  return (
    <>
      <BriefingHeader />
      <main className="mx-auto flex min-h-screen max-w-xl flex-col px-6 pt-24 pb-32">
        {/* Antes da escolha do serviço o caminho ainda não existe: mostrar um
          total que vai crescer de 3 pra 5 promete um formulário mais curto do
          que o que vem. Até lá, só a barra do passo atual. */}
        <div className="flex gap-1.5">
          {(values.servico ? steps : [current]).map((s, i) => (
            <div
              key={s.title}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-neutral-900" : "bg-neutral-200"
              }`}
            />
          ))}
        </div>

        <p className="mt-8 text-xs font-medium uppercase tracking-wide text-neutral-400">
          {values.servico
            ? `Passo ${step + 1} de ${steps.length}`
            : `Passo ${step + 1}`}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
          {current.title}
        </h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            advance();
          }}
          className="mt-8 space-y-5"
        >
          {visibleFields.map((field, i) => (
            <div key={field.name}>
              <label
                htmlFor={field.name}
                className={
                  field.labelHidden
                    ? "sr-only"
                    : "mb-1 block text-sm font-medium text-neutral-700"
                }
              >
                {field.label}
                {!field.required && (
                  <span className="ml-1 font-normal text-neutral-400">
                    (opcional)
                  </span>
                )}
              </label>
              {field.hint && (
                <p className="mb-1.5 text-xs text-neutral-400">{field.hint}</p>
              )}

              {field.type === "choice" ? (
                <div className="flex flex-wrap gap-2">
                  {field.options?.map((option) => {
                    const active = values[field.name] === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setAndMaybeAdvance(field.name, option)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition-transform active:scale-[0.97] ${
                          active
                            ? "border-neutral-900 bg-neutral-900 text-white"
                            : "border-neutral-300 text-neutral-700 hover:border-neutral-500"
                        }`}
                      >
                        {option}
                      </button>
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
                  aria-describedby={contatoRuim ? "contato-erro" : undefined}
                  value={values[field.name] ?? ""}
                  onChange={(e) => set(field.name, e.target.value)}
                  className={`${INPUT} ${contatoRuim ? "border-red-500" : ""}`}
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
                <p id="contato-erro" className="mt-1.5 text-sm text-red-600">
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
                    className="mt-1.5 text-sm text-neutral-400 underline-offset-2 hover:text-neutral-700 hover:underline"
                  >
                    Pular essa
                  </button>
                )}
            </div>
          ))}

          {/* Preso à base da viewport, não ao fim da página: com pergunta
              surgindo aos poucos a tela raramente cresce o bastante pra
              esconder o botão, mas travar ele aqui garante isso mesmo assim.
              bottom-20 dá espaço pro rodapé fixo, que no celular quebra em
              duas linhas e fica mais alto. */}
          <div className="sticky bottom-20 mt-6 flex items-center gap-3 border-t border-neutral-200 bg-white/95 py-3 backdrop-blur">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                disabled={pending}
                className="rounded-md px-3 py-2 text-sm text-neutral-500 transition-transform hover:text-neutral-900 active:scale-[0.97] disabled:opacity-40"
              >
                Voltar
              </button>
            )}
            <button
              type="submit"
              disabled={missing.length > 0 || contatoRuim || pending}
              className="ml-auto rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-transform active:scale-[0.97] disabled:opacity-40"
            >
              {pending ? "Enviando…" : isLast ? "Enviar briefing" : "Continuar"}
            </button>
          </div>
        </form>

        {error && (
          <p className="mt-6 text-sm text-red-600">
            {ERROR_MESSAGES[error] ?? "Algo deu errado. Tenta de novo."}
          </p>
        )}
      </main>
      <BriefingFooter />
    </>
  );
}
