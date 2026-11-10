"use client";

import {
  Field,
  FIELD_CLASS,
  RepeatableList,
} from "@/components/admin/budget/RepeatableList";
import { PriceInput } from "@/components/admin/budget/PriceInput";
import type { PricingPackage } from "@/lib/budgetSections";

/**
 * Os pacotes (e os avulsos): nome, preço, unidade e a lista de linhas. Cada
 * linha tem título, quantidade (subtítulo) e a descrição que abre no "+".
 */
export function PackagesFields({
  packages,
  onChange,
  featuredAllowed,
}: {
  packages: PricingPackage[];
  onChange: (packages: PricingPackage[]) => void;
  featuredAllowed: boolean;
}) {
  return (
    <Field label="Pacotes" grupo>
      <RepeatableList
        items={packages}
        onChange={onChange}
        rotulo="Pacote"
        vazio="Nenhum pacote — a seção some e o botão da capa não aparece."
        novoItem={() => ({
          name: "",
          price: 0,
          unit: "",
          subtitle: "",
          description: "",
          items: [],
          featured: false,
        })}
      >
        {(pacote, trocar) => (
          <>
            <div className="flex items-center justify-between gap-2">
              <input
                value={pacote.name}
                onChange={(e) => trocar({ ...pacote, name: e.target.value })}
                className={FIELD_CLASS}
                placeholder="Nome do pacote"
              />
              {featuredAllowed ? (
                <label className="flex shrink-0 items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-neutral-500">
                  <input
                    type="checkbox"
                    checked={pacote.featured}
                    onChange={(e) =>
                      trocar({ ...pacote, featured: e.target.checked })
                    }
                    className="h-3.5 w-3.5 accent-neutral-900"
                  />
                  Destaque
                </label>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <PriceInput
                value={pacote.price}
                onChange={(price) => trocar({ ...pacote, price })}
              />
              <input
                value={pacote.unit}
                onChange={(e) => trocar({ ...pacote, unit: e.target.value })}
                className={FIELD_CLASS}
                placeholder="/ mês, / arte..."
              />
            </div>
            <p className="text-[11px] leading-relaxed text-neutral-400">
              Preço 0 aparece como &quot;A definir&quot;.
            </p>
            <input
              value={pacote.subtitle}
              onChange={(e) => trocar({ ...pacote, subtitle: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Subtítulo (ex.: campeão de vendas)"
            />
            <input
              value={pacote.description}
              onChange={(e) =>
                trocar({ ...pacote, description: e.target.value })
              }
              className={FIELD_CLASS}
              placeholder="Descrição curta, abaixo do preço"
            />
            <Field label="Itens" grupo>
              <RepeatableList
                items={pacote.items}
                onChange={(items) => trocar({ ...pacote, items })}
                rotulo="Item"
                novoItem={() => ({ title: "", detail: "", description: "" })}
              >
                {(item, trocarItem) => (
                  <>
                    <input
                      value={item.title}
                      onChange={(e) =>
                        trocarItem({ ...item, title: e.target.value })
                      }
                      className={FIELD_CLASS}
                      placeholder="Título (ex.: Vídeos)"
                    />
                    <input
                      value={item.detail}
                      onChange={(e) =>
                        trocarItem({ ...item, detail: e.target.value })
                      }
                      className={FIELD_CLASS}
                      placeholder="Quantidade (ex.: 3 vídeos · 3 externos)"
                    />
                    <textarea
                      value={item.description}
                      onChange={(e) =>
                        trocarItem({ ...item, description: e.target.value })
                      }
                      rows={3}
                      className={FIELD_CLASS}
                      placeholder="Descrição (aparece ao abrir o +). Vazio = sem +"
                    />
                  </>
                )}
              </RepeatableList>
            </Field>
          </>
        )}
      </RepeatableList>
    </Field>
  );
}
