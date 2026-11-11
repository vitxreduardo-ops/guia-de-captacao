"use client";

import {
  Field,
  FIELD_CLASS,
  RepeatableList,
  TextList,
} from "@/components/admin/budget/RepeatableList";
import { LogoLibrary } from "@/components/admin/budget/LogoLibrary";
import { PackagesFields } from "@/components/admin/budget/PackagesFields";
import { UploadButton } from "@/components/admin/budget/UploadButton";
import {
  MAX_BLUR,
  type BudgetSection,
  type ListSectionData,
  type SectionData,
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
  budgetId,
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
          <Field label="Foto ou vídeo de fundo">
            <input
              value={data.mediaUrl}
              onChange={(e) => set({ mediaUrl: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Link da imagem, .mp4, YouTube ou Vimeo"
            />
            <div className="mt-1.5">
              <UploadButton
                budgetId={budgetId}
                onUploaded={(url) => set({ mediaUrl: url })}
                label="Enviar foto do computador"
              />
            </div>
          </Field>

          <Field label={`Desfoque do fundo — ${data.blur}px`}>
            <input
              type="range"
              min={0}
              max={MAX_BLUR}
              step={1}
              value={data.blur}
              onChange={(e) => set({ blur: Number(e.target.value) })}
              disabled={!(data.mediaUrl ?? "").trim()}
              className="w-full accent-neutral-900 disabled:opacity-40"
            />
          </Field>

          <p className="text-[11px] leading-relaxed text-neutral-400">
            Sem mídia a capa fica na cor de fundo. Desfocar ajuda o título a
            respirar quando a imagem é cheia de detalhe.
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
          <Field label="Serviços / diferenciais" grupo>
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
          <Field label="Projetos" grupo>
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
                  <UploadButton
                    budgetId={budgetId}
                    onUploaded={(url) =>
                      trocar({ ...projeto, url, mediaType: "image" })
                    }
                    label="Enviar imagem do computador"
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
          <Field grupo label={`Logos — ${data.logos.length} escolhido${data.logos.length === 1 ? "" : "s"}`}>
            <LogoLibrary
              budgetId={budgetId}
              escolhidos={data.logos}
              onChange={(logos) =>
                onChange({
                  ...section,
                  // Escolher o primeiro logo liga a seção: sem isso, marcar uma
                  // marca não mudaria nada na proposta e ninguém entenderia por
                  // quê. O mesmo que a calculadora faz ao gerar os pacotes.
                  enabled: section.enabled || logos.length > 0,
                  data: { ...data, logos },
                })
              }
            />
          </Field>
          <p className="text-[11px] leading-relaxed text-neutral-400">
            A biblioteca é a mesma em todas as propostas. Escolha aqui só as
            marcas que conversam com este cliente — sem nenhuma marcada, a seção
            não aparece para ele.
          </p>
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
          <PackagesFields
            packages={data.packages}
            onChange={(packages) => set({ packages })}
            featuredAllowed
          />
        </div>
      );
    }

    case "avulsos": {
      const { data } = section;
      const set = (patch: Partial<SectionData["avulsos"]>) =>
        onChange({ ...section, data: { ...data, ...patch } });

      return (
        <div className="space-y-3">
          <Field label="Etiqueta">
            <input
              value={data.eyebrow}
              onChange={(e) => set({ eyebrow: e.target.value })}
              className={FIELD_CLASS}
              placeholder="AVULSOS"
            />
          </Field>
          <Field label="Título">
            <input
              value={data.title}
              onChange={(e) => set({ title: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Peças pontuais, orçadas à parte"
            />
          </Field>
          <Field label="Texto de apoio">
            <textarea
              value={data.subtitle}
              onChange={(e) => set({ subtitle: e.target.value })}
              rows={2}
              className={FIELD_CLASS}
            />
          </Field>
          <Field label="Texto do botão">
            <input
              value={data.cta}
              onChange={(e) => set({ cta: e.target.value })}
              className={FIELD_CLASS}
              placeholder="Solicitar orçamento"
            />
          </Field>
          <PackagesFields
            packages={data.packages}
            onChange={(packages) => set({ packages })}
            featuredAllowed={false}
          />
          <Field label="Rodapé (uma linha por item)" grupo>
            <TextList
              items={data.notes}
              onChange={(notes) => set({ notes })}
              rotulo="linha"
              placeholder="Orçamento aprovado por escrito antes de começar."
            />
          </Field>
        </div>
      );
    }

    case "whyExternal": {
      const { data } = section;
      const set = (patch: Partial<SectionData["whyExternal"]>) =>
        onChange({ ...section, data: { ...data, ...patch } });

      return (
        <div className="space-y-3">
          <Field label="Etiqueta">
            <input
              value={data.eyebrow}
              onChange={(e) => set({ eyebrow: e.target.value })}
              className={FIELD_CLASS}
            />
          </Field>
          <Field label="Título">
            <input
              value={data.title}
              onChange={(e) => set({ title: e.target.value })}
              className={FIELD_CLASS}
            />
          </Field>
          <Field label="Texto">
            <textarea
              value={data.text}
              onChange={(e) => set({ text: e.target.value })}
              rows={8}
              className={FIELD_CLASS}
              placeholder="Parágrafos separados por linha em branco"
            />
          </Field>
        </div>
      );
    }

    case "regras": {
      const { data } = section;
      const set = (patch: Partial<SectionData["regras"]>) =>
        onChange({ ...section, data: { ...data, ...patch } });

      return (
        <div className="space-y-3">
          <Field label="Etiqueta">
            <input
              value={data.eyebrow}
              onChange={(e) => set({ eyebrow: e.target.value })}
              className={FIELD_CLASS}
            />
          </Field>
          <Field label="Título">
            <input
              value={data.title}
              onChange={(e) => set({ title: e.target.value })}
              className={FIELD_CLASS}
            />
          </Field>
          <Field label="Blocos" grupo>
            <RepeatableList
              items={data.blocks}
              onChange={(blocks) => set({ blocks })}
              rotulo="Bloco"
              vazio="Nenhum bloco — a seção some."
              novoItem={() => ({ title: "", lines: [] })}
            >
              {(bloco, trocar) => (
                <>
                  <input
                    value={bloco.title}
                    onChange={(e) => trocar({ ...bloco, title: e.target.value })}
                    className={FIELD_CLASS}
                    placeholder="Ex.: Ajuste × refação"
                  />
                  <TextList
                    items={bloco.lines}
                    onChange={(lines) => trocar({ ...bloco, lines })}
                    rotulo="linha"
                    placeholder="Uma regra por linha"
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
          <Field label="Perguntas" grupo>
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
          <Field label="Itens" grupo>
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
