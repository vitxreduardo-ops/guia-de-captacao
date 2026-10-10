"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { formatBRL } from "@/lib/billingTypes";

const MONTH_SHORT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

/**
 * Faturamento mês a mês. As barras sobem do chão em vez de aparecerem prontas:
 * o crescimento aponta para onde o valor chegou, o que é mais fácil de ler do
 * que doze alturas surgindo de uma vez. Sem repique — dinheiro não quica.
 *
 * A altura é porcentagem do maior mês do período, então trocar de ano ou de
 * cliente reescala o gráfico inteiro.
 */
export interface MonthClient {
  name: string;
  cents: number;
}

const MONTH_LONG = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function YearBarChart({
  byMonth,
  clientsByMonth,
}: {
  byMonth: number[];
  /** Quem compõe cada mês (índice 0 = janeiro), do maior pro menor. */
  clientsByMonth: MonthClient[][];
}) {
  const reduceMotion = useReducedMotion();
  const boxRef = useRef<HTMLDivElement>(null);
  // Mês sob o mouse e onde mostrar a dica, em pixels dentro do gráfico.
  const [tip, setTip] = useState<{
    month: number;
    x: number;
    y: number;
    flip: boolean;
  } | null>(null);

  function track(month: number, clientX: number, clientY: number) {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = clientX - box.left;
    setTip({ month, x, y: clientY - box.top, flip: x > box.width / 2 });
  }

  const peak = Math.max(...byMonth, 1);
  const total = byMonth.reduce((sum, value) => sum + value, 0);

  // Doze barras de dois pixels não são um gráfico vazio: são um gráfico que
  // parece quebrado. Sem nenhum mês fechado, o lugar diz o que fazer.
  if (total === 0) {
    return (
      <p className="flex h-40 items-center justify-center rounded-md border border-dashed border-neutral-200 px-4 text-center text-sm text-neutral-500">
        Nenhum mês fechado neste período. O gráfico se enche conforme você fecha
        os meses em Faturamento.
      </p>
    );
  }

  return (
    <div ref={boxRef} className="relative" onPointerLeave={() => setTip(null)}>
      <div
        role="img"
        aria-label={`Faturamento mês a mês, ${MONTH_SHORT.map(
          (name, index) => `${name} ${formatBRL(byMonth[index])}`,
        ).join(", ")}`}
        className="flex h-40 items-end gap-1.5"
      >
        {byMonth.map((value, index) => {
          const height = `${Math.round((value / peak) * 90)}%`;
          return (
            <div
              key={MONTH_SHORT[index]}
              onPointerMove={(event) =>
                track(index, event.clientX, event.clientY)
              }
              onPointerDown={(event) =>
                track(index, event.clientX, event.clientY)
              }
              // `h-full` porque a barra tem altura em porcentagem: sem uma altura
              // definida no pai, a porcentagem não resolve e a barra some.
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
            >
              {/* Doze valores não cabem legíveis num celular; a leitura fina
                fica pro desktop, e no mobile o número vive no aria-label do
                gráfico e na lista "Por cliente" logo abaixo. */}
              <span className="hidden text-[11px] text-neutral-500 tabular-nums sm:block">
                {value > 0 ? formatBRL(value) : ""}
              </span>
              {/* A altura final já vem no `style`; a entrada é só uma escala
                vertical, que roda no compositor e não remede o layout doze
                vezes por quadro. */}
              <motion.div
                aria-hidden
                style={{ height, originY: 1 }}
                // `initial` não pode depender da preferência de movimento: o
                // servidor não a conhece, e decidir aqui faria o HTML entregue
                // divergir do que o cliente monta. Quem pede menos movimento
                // recebe a mesma barra, só que já no lugar (duração zero).
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : {
                        type: "spring",
                        bounce: 0,
                        duration: 0.5,
                        // Cada mês entra logo depois do anterior: o gráfico é
                        // lido da esquerda pra direita, e a entrada segue a
                        // mesma ordem.
                        delay: index * 0.02,
                      }
                }
                className={`min-h-[2px] w-full rounded-t ${
                  value > 0 ? "bg-neutral-900" : "bg-neutral-100"
                }`}
              />
              <span className="text-[11px] text-neutral-500">
                {MONTH_SHORT[index]}
              </span>
            </div>
          );
        })}
      </div>

      {tip && byMonth[tip.month] > 0 ? (
        <div
          role="tooltip"
          // Segue o mouse, deslocada pra não ficar embaixo do cursor, e vira de
          // lado perto da borda direita pra não cortar.
          style={{
            left: tip.x,
            top: tip.y,
            transform: `translate(${
              tip.flip ? "calc(-100% - 12px)" : "12px"
            }, -50%)`,
          }}
          className="pointer-events-none absolute z-10 w-56 rounded-md border border-neutral-200 bg-white p-2.5 text-xs shadow-md"
        >
          <p className="mb-1.5 flex justify-between font-semibold text-neutral-900">
            <span>{MONTH_LONG[tip.month]}</span>
            <span className="tabular-nums">
              {formatBRL(byMonth[tip.month])}
            </span>
          </p>
          <ul className="flex flex-col gap-1">
            {clientsByMonth[tip.month].map((client) => (
              <li
                key={client.name}
                className="flex justify-between gap-3 text-neutral-700"
              >
                <span className="min-w-0 truncate">{client.name}</span>
                <span className="tabular-nums">{formatBRL(client.cents)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
