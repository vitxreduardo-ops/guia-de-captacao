"use client";

import {
  Field,
  FIELD_CLASS,
  RepeatableList,
  TextList,
} from "@/components/admin/budget/RepeatableList";
import type {
  BudgetSection,
  ListSectionData,
  SectionData,
} from "@/lib/budgetSections";

/**
 * Os campos de uma seção. Cada kind tem a sua forma, então isto é um switch —
 * as quatro seções de lista dividem um bloco só, como já dividem o componente
 * de render.
 *
 * Nada aqui salva: cada tecla devolve a seção inteira ao editor, que decide
 * quando gravar.
 */
export function SectionFields({
  section,
  onChange,
}: {
  section: BudgetSection;
  onChange: (section: BudgetSection) => void;
  budgetId: string;
}) {
  switch (section.kind) {
    case "cover": {
      const { data } = section;
      const set = (patch: Partial<SectionData["cover"]>) =>
        onChange({ ...section, data: { ...data, ...patch } });

      return (
        <div className="space-y-3">
          <Field label="Etiqueta">
            <input
              value={data.eyebrow}
              onChange={(e) => set({ eyebrow: e.target.value })}
              className={FIELD_CLASS}
              placeholder="PROPOSTA CRIATIVA · 2026"
            />
          </Field>
          <Field label="Título">
            <input
              value={data.title}
              onChange={(e) => set({ title: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Nome do cliente"
            />
          </Field>
          <Field label="Subtítulo">
            <textarea
              value={data.subtitle}
              onChange={(e) => set({ subtitle: e.target.value })}
              rows={3}
              className={FIELD_CLASS}
            />
          </Field>
          <Field label="Texto do botão">
            <input
              value={data.cta}
              onChange={(e) => set({ cta: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Conhecer a proposta"
            />
          </Field>
          <Field label="Vídeo de fundo">
            <input
              value={data.videoUrl}
              onChange={(e) => set({ videoUrl: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Link .mp4, YouTube ou Vimeo"
            />
          </Field>
          <p className="text-[11px] leading-relaxed text-neutral-400">
            Sem vídeo a capa fica na cor de fundo. Não é lugar de vídeo de
            teste: é a primeira coisa que o cliente vê.
          </p>
        </div>
      );
    }

    case "about": {
      const { data } = section;
      const set = (patch: Partial<SectionData["about"]>) =>
        onChange({ ...section, data: { ...data, ...patch } });

      return (
        <div className="space-y-3">
          <Field label="Etiqueta">
            <input
              value={data.eyebrow}
              onChange={(e) => set({ eyebrow: e.target.value })}
              className={FIELD_CLASS}
              placeholder="NOSSA LEITURA"
            />
          </Field>
          <Field label="Título">
            <textarea
              value={data.title}
              onChange={(e) => set({ title: e.target.value })}
              rows={2}
              className={FIELD_CLASS}
            />
          </Field>
          <Field label="Subtítulo">
            <input
              value={data.subtitle}
              onChange={(e) => set({ subtitle: e.target.value })}
              className={FIELD_CLASS}
            />
          </Field>
          <Field label="Texto">
            <textarea
              value={data.text}
              onChange={(e) => set({ text: e.target.value })}
              rows={5}
              className={FIELD_CLASS}
            />
          </Field>
          <Field label="Serviços / diferenciais">
            <TextList
              items={data.items}
              onChange={(items) => set({ items })}
              rotulo="serviço"
              placeholder="Direção criativa"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Número de destaque">
              <input
                value={data.statNumber}
                onChange={(e) => set({ statNumber: e.target.value })}
                className={FIELD_CLASS}
                placeholder="150+"
              />
            </Field>
            <Field label="Legenda do número">
              <input
                value={data.statCaption}
                onChange={(e) => set({ statCaption: e.target.value })}
                className={FIELD_CLASS}
                placeholder="projetos no ar"
              />
            </Field>
          </div>
        </div>
      );
    }

    case "portfolio": {
      const { data } = section;
      const set = (patch: Partial<SectionData["portfolio"]>) =>
        onChange({ ...section, data: { ...data, ...patch } });

      return (
        <div className="space-y-3">
          <Field label="Etiqueta">
            <input
              value={data.eyebrow}
              onChange={(e) => set({ eyebrow: e.target.value })}
              className={FIELD_CLASS}
              placeholder="TRABALHOS SELECIONADOS"
            />
          </Field>
          <Field label="Título">
            <input
              value={data.title}
              onChange={(e) => set({ title: e.target.value })}
              className={FIELD_CLASS}
              placeholder="O que já colocamos no ar"
            />
          </Field>
          <Field label="Subtítulo">
            <input
              value={data.subtitle}
              onChange={(e) => set({ subtitle: e.target.value })}
              className={FIELD_CLASS}
            />
          </Field>
          <Field label="Projetos">
            <RepeatableList
              items={data.projects}
              onChange={(projects) => set({ projects })}
              rotulo="Projeto"
              vazio="Nenhum projeto ainda — esta seção não aparece para o cliente."
              novoItem={() => ({
                name: "",
                tag: "",
                url: "",
                mediaType: "image" as const,
                orientation: "horizontal" as const,
              })}
            >
              {(projeto, trocar) => (
                <>
                  <input
                    value={projeto.name}
                    onChange={(e) => trocar({ ...projeto, name: e.target.value })}
                    className={FIELD_CLASS}
                    placeholder="Nome do projeto"
                  />
                  <input
                    value={projeto.tag}
                    onChange={(e) => trocar({ ...projeto, tag: e.target.value })}
                    className={FIELD_CLASS}
                    placeholder="Etiqueta (ex.: Institucional)"
                  />
                  <input
                    value={projeto.url}
                    onChange={(e) => trocar({ ...projeto, url: e.target.value })}
                    className={FIELD_CLASS}
                    placeholder="URL da imagem ou vídeo"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <select
                      value={projeto.mediaType}
                      onChange={(e) =>
                        trocar({
                          ...projeto,
                          mediaType:
                            e.target.value === "video" ? "video" : "image",
                        })
                      }
                      className={FIELD_CLASS}
                    >
                      <option value="image">Imagem</option>
                      <option value="video">Vídeo</option>
                    </select>
                    <select
                      value={projeto.orientation}
                      onChange={(e) =>
                        trocar({
                          ...projeto,
                          orientation:
                            e.target.value === "vertical"
                              ? "vertical"
                              : "horizontal",
                        })
                      }
                      className={FIELD_CLASS}
                    >
                      <option value="horizontal">Horizontal</option>
                      <option value="vertical">Vertical</option>
                    </select>
                  </div>
                </>
              )}
            </RepeatableList>
          </Field>
        </div>
      );
    }

    case "logos": {
      const { data } = section;
      const set = (patch: Partial<SectionData["logos"]>) =>
        onChange({ ...section, data: { ...data, ...patch } });

      return (
        <div className="space-y-3">
          <Field label="Etiqueta">
            <input
              value={data.eyebrow}
              onChange={(e) => set({ eyebrow: e.target.value })}
              className={FIELD_CLASS}
              placeholder="QUEM JÁ CONFIA"
            />
          </Field>
          <Field label="Título">
            <input
              value={data.title}
              onChange={(e) => set({ title: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Marcas que já colocamos em movimento"
            />
          </Field>
          <Field label="Logos">
            <RepeatableList
              items={data.logos}
              onChange={(logos) => set({ logos })}
              rotulo="Logo"
              vazio="Nenhum logo adicionado — esta seção não aparece para o cliente."
              novoItem={() => ({ name: "", url: "" })}
            >
              {(logo, trocar) => (
                <>
                  <input
                    value={logo.name}
                    onChange={(e) => trocar({ ...logo, name: e.target.value })}
                    className={FIELD_CLASS}
                    placeholder="Nome do cliente"
                  />
                  <input
                    value={logo.url}
                    onChange={(e) => trocar({ ...logo, url: e.target.value })}
                    className={FIELD_CLASS}
                    placeholder="URL do logo, ou /clientes/arquivo.svg"
                  />
                </>
              )}
            </RepeatableList>
          </Field>
        </div>
      );
    }

    case "pricing": {
      const { data } = section;
      const set = (patch: Partial<SectionData["pricing"]>) =>
        onChange({ ...section, data: { ...data, ...patch } });

      return (
        <div className="space-y-3">
          <Field label="Etiqueta">
            <input
              value={data.eyebrow}
              onChange={(e) => set({ eyebrow: e.target.value })}
              className={FIELD_CLASS}
              placeholder="INVESTIMENTO"
            />
          </Field>
          <Field label="Título">
            <input
              value={data.title}
              onChange={(e) => set({ title: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Escolha a rota"
            />
          </Field>
          <Field label="Subtítulo">
            <input
              value={data.subtitle}
              onChange={(e) => set({ subtitle: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Todos os pacotes são mensais e recorrentes."
            />
          </Field>
          <Field label="Texto do botão">
            <input
              value={data.cta}
              onChange={(e) => set({ cta: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Escolher este pacote"
            />
          </Field>
          <Field label="Pacotes">
            <RepeatableList
              items={data.packages}
              onChange={(packages) => set({ packages })}
              rotulo="Pacote"
              vazio="Nenhum pacote — a seção some e o botão da capa não aparece."
              novoItem={() => ({
                name: "",
                price: 0,
                subtitle: "",
                description: "",
                features: [],
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
                  </div>
                  <input
                    type="number"
                    value={pacote.price}
                    min={0}
                    step="0.01"
                    onChange={(e) =>
                      trocar({ ...pacote, price: Number(e.target.value) || 0 })
                    }
                    className={FIELD_CLASS}
                    placeholder="Preço"
                  />
                  <input
                    value={pacote.subtitle}
                    onChange={(e) =>
                      trocar({ ...pacote, subtitle: e.target.value })
                    }
                    className={FIELD_CLASS}
                    placeholder="Subtítulo (ex.: campeão de vendas)"
                  />
                  <input
                    value={pacote.description}
                    onChange={(e) =>
                      trocar({ ...pacote, description: e.target.value })
                    }
                    className={FIELD_CLASS}
                    placeholder="Descrição (ex.: 6 vídeos · diária completa)"
                  />
                  <TextList
                    items={pacote.features}
                    onChange={(features) => trocar({ ...pacote, features })}
                    rotulo="item"
                    placeholder="Direção criativa"
                  />
                </>
              )}
            </RepeatableList>
          </Field>
        </div>
      );
    }

    case "faq": {
      const { data } = section;
      const set = (patch: Partial<SectionData["faq"]>) =>
        onChange({ ...section, data: { ...data, ...patch } });

      return (
        <div className="space-y-3">
          <Field label="Etiqueta">
            <input
              value={data.eyebrow}
              onChange={(e) => set({ eyebrow: e.target.value })}
              className={FIELD_CLASS}
              placeholder="DÚVIDAS FREQUENTES"
            />
          </Field>
          <Field label="Título">
            <input
              value={data.title}
              onChange={(e) => set({ title: e.target.value })}
              className={FIELD_CLASS}
              placeholder="O que costumam perguntar"
            />
          </Field>
          <Field label="Perguntas">
            <RepeatableList
              items={data.items}
              onChange={(items) => set({ items })}
              rotulo="Pergunta"
              vazio="Nenhuma pergunta — esta seção não aparece para o cliente."
              novoItem={() => ({ question: "", answer: "" })}
            >
              {(item, trocar) => (
                <>
                  <input
                    value={item.question}
                    onChange={(e) => trocar({ ...item, question: e.target.value })}
                    className={FIELD_CLASS}
                    placeholder="Pergunta"
                  />
                  <textarea
                    value={item.answer}
                    onChange={(e) => trocar({ ...item, answer: e.target.value })}
                    rows={3}
                    className={FIELD_CLASS}
                    placeholder="Resposta"
                  />
                </>
              )}
            </RepeatableList>
          </Field>
          <p className="text-[11px] leading-relaxed text-neutral-400">
            Pergunta sem texto é descartada ao salvar.
          </p>
        </div>
      );
    }

    case "footer": {
      const { data } = section;
      const set = (patch: Partial<SectionData["footer"]>) =>
        onChange({ ...section, data: { ...data, ...patch } });

      return (
        <div className="space-y-3">
          <Field label="Frase do rodapé">
            <textarea
              value={data.phrase}
              onChange={(e) => set({ phrase: e.target.value })}
              rows={3}
              className={FIELD_CLASS}
              placeholder="Estratégia, direção criativa e audiovisual para marcas que decidiram ocupar espaço."
            />
          </Field>
          <Field label="Instagram (URL)">
            <input
              value={data.instagram}
              onChange={(e) => set({ instagram: e.target.value })}
              className={FIELD_CLASS}
              placeholder="https://instagram.com/..."
            />
          </Field>
          <Field label="YouTube (URL)">
            <input
              value={data.youtube}
              onChange={(e) => set({ youtube: e.target.value })}
              className={FIELD_CLASS}
              placeholder="https://youtube.com/..."
            />
          </Field>
          <Field label="E-mail">
            <input
              value={data.email}
              onChange={(e) => set({ email: e.target.value })}
              className={FIELD_CLASS}
            />
          </Field>
          <Field label="Telefone">
            <input
              value={data.phone}
              onChange={(e) => set({ phone: e.target.value })}
              className={FIELD_CLASS}
              placeholder="77 99954-8155"
            />
          </Field>
          <p className="text-[11px] leading-relaxed text-neutral-400">
            Só os canais preenchidos viram link.
          </p>
        </div>
      );
    }

    default: {
      // package1, package1Extra, package2Perks e strategy: a mesma forma.
      const data: ListSectionData = section.data;
      const set = (patch: Partial<ListSectionData>) =>
        onChange({ ...section, data: { ...data, ...patch } } as BudgetSection);

      return (
        <div className="space-y-3">
          <Field label="Etiqueta">
            <input
              value={data.eyebrow}
              onChange={(e) => set({ eyebrow: e.target.value })}
              className={FIELD_CLASS}
              placeholder="O QUE ENTRA"
            />
          </Field>
          <Field label="Título">
            <input
              value={data.title}
              onChange={(e) => set({ title: e.target.value })}
              className={FIELD_CLASS}
            />
          </Field>
          <Field label="Subtítulo">
            <input
              value={data.subtitle}
              onChange={(e) => set({ subtitle: e.target.value })}
              className={FIELD_CLASS}
            />
          </Field>
          <Field label="Itens">
            <TextList
              items={data.items}
              onChange={(items) => set({ items })}
              rotulo="item"
            />
          </Field>
        </div>
      );
    }
  }
}
