"use client";

import { useState, useTransition } from "react";
import { submitBriefingAction } from "./actions";
import { stepsFor } from "./fields";

const INPUT =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 transition-colors focus:border-neutral-500 focus:outline-none";

const ERROR_MESSAGES: Record<string, string> = {
  campos: "Faltou preencher algum campo obrigatório.",
  servidor: "Não consegui salvar agora. Tenta de novo em instantes.",
};

export default function BriefingPage() {
  const [rawStep, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

  function set(name: string, value: string) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  function advance() {
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

  if (sent) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Briefing enviado
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Recebi tudo. Respondo no seu WhatsApp em até 1 dia útil.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-6 py-16">
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

      <div className="mt-8 space-y-5">
        {current.fields.map((field) => (
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
                      onClick={() => set(field.name, option)}
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
            ) : (
              <input
                id={field.name}
                type="text"
                value={values[field.name] ?? ""}
                onChange={(e) => set(field.name, e.target.value)}
                className={INPUT}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-6 text-sm text-red-600">
          {ERROR_MESSAGES[error] ?? "Algo deu errado. Tenta de novo."}
        </p>
      )}

      <div className="mt-10 flex items-center gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="rounded-md px-3 py-2 text-sm text-neutral-500 transition-transform hover:text-neutral-900 active:scale-[0.97]"
          >
            Voltar
          </button>
        )}
        <button
          type="button"
          disabled={missing.length > 0 || pending}
          onClick={advance}
          className="ml-auto rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-transform active:scale-[0.97] disabled:opacity-40"
        >
          {pending ? "Enviando…" : isLast ? "Enviar briefing" : "Continuar"}
        </button>
      </div>
    </main>
  );
}
