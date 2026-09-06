"use client";

import { motion, useReducedMotion } from "motion/react";
import { formatBRL } from "@/lib/billingTypes";

const MONTH_SHORT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/**
 * Faturamento mês a mês. As barras sobem do chão em vez de aparecerem prontas:
 * o crescimento aponta para onde o valor chegou, o que é mais fácil de ler do
 * que doze alturas surgindo de uma vez. Sem repique — dinheiro não quica.
 *
 * A altura é porcentagem do maior mês do período, então trocar de ano ou de
 * cliente reescala o gráfico inteiro.
 */
export function YearBarChart({ byMonth }: { byMonth: number[] }) {
  const reduceMotion = useReducedMotion();
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
    <div
      role="img"
      aria-label={`Faturamento mês a mês, ${MONTH_SHORT.map(
        (name, index) => `${name} ${formatBRL(byMonth[index])}`
      ).join(", ")}`}
      className="flex h-40 items-end gap-1.5"
    >
      {byMonth.map((value, index) => {
        const height = `${Math.round((value / peak) * 90)}%`;
        return (
          <div
            key={MONTH_SHORT[index]}
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
  );
}
