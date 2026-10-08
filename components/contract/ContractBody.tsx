import {
  PREENCHIDO_ABRE,
  PREENCHIDO_FECHA,
  contractBlocks,
  contractTable,
} from "@/lib/contractBody";

/**
 * O corpo do contrato, já com as variáveis trocadas, desenhado na tela.
 *
 * Markdown suficiente pro que os modelos usam: `##` vira título e `**x**`
 * vira negrito. Uma biblioteca de Markdown resolveria o resto do CommonMark,
 * que nenhum contrato daqui escreve — e traria HTML arbitrário vindo de um
 * campo de texto para uma página pública. Aqui nada vira HTML: o texto entra
 * como texto, em nós React.
 */
export function ContractBody({
  text,
  onPlaceholder,
}: {
  text: string;
  /** Só o editor passa: destaca em vermelho o que ainda está por preencher
   *  (`[CNPJ]`, `{{valor}}`) e avisa quando clicam. A página do cliente não
   *  passa, e o texto sai sem marcação. */
  onPlaceholder?: Marcar;
}) {
  const blocos = contractBlocks(text);

  return (
    <div className="space-y-4">
      {blocos.map((bloco, indice) => {
        const limpo = bloco;

        if (limpo.startsWith("## ")) {
          return (
            <h2
              key={indice}
              className="pt-4 text-base font-semibold text-[var(--tatu-ink)]"
            >
              {limpo.slice(3)}
            </h2>
          );
        }

        const tabela = contractTable(limpo);
        if (tabela) {
          const [cabecalho, ...linhas] = tabela;
          return (
            <div key={indice} className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs leading-snug text-[var(--tatu-ink)]/85">
                <thead>
                  <tr>
                    {cabecalho.map((celula, i) => (
                      <th
                        key={i}
                        className="border border-[var(--tatu-ink)]/15 bg-[var(--tatu-ink)]/5 px-2 py-1.5 font-semibold"
                      >
                        <Inline text={celula} onPlaceholder={onPlaceholder} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((linha, r) => (
                    <tr key={r}>
                      {linha.map((celula, i) => (
                        <td
                          key={i}
                          className="border border-[var(--tatu-ink)]/15 px-2 py-1.5 align-top"
                        >
                          <Inline text={celula} onPlaceholder={onPlaceholder} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return (
          <p
            key={indice}
            className="text-sm leading-relaxed whitespace-pre-line text-[var(--tatu-ink)]/85"
          >
            <Inline text={limpo} onPlaceholder={onPlaceholder} />
          </p>
        );
      })}
    </div>
  );
}

export type Marcar = (placeholder: string, elemento: HTMLElement) => void;

// `[CNPJ]`, `[12]` e `{{valor}}`: tudo o que o modelo deixa para preencher; e,
// entre as marcas, o que já foi escrito no lugar de um campo.
const PLACEHOLDER = new RegExp(
  `(${PREENCHIDO_ABRE}[^${PREENCHIDO_FECHA}]*${PREENCHIDO_FECHA}|\\[[^\\]\\n]+\\]|\\{\\{\\w+\\}\\})`,
);
const MARCAS = new RegExp(`[${PREENCHIDO_ABRE}${PREENCHIDO_FECHA}]`, "g");

function Trecho({
  text,
  onPlaceholder,
}: {
  text: string;
  onPlaceholder?: Marcar;
}) {
  if (!onPlaceholder) return <>{text.replace(MARCAS, "")}</>;
  return (
    <>
      {text.split(PLACEHOLDER).map((parte, i) =>
        i % 2 === 1 ? (
          <button
            key={i}
            type="button"
            data-ph
            title={
              parte.startsWith(PREENCHIDO_ABRE)
                ? "Preenchido. Clique para editar"
                : "Falta preencher. Clique para editar este campo"
            }
            onClick={(e) =>
              onPlaceholder(parte.replace(MARCAS, ""), e.currentTarget)
            }
            className={`cursor-pointer rounded px-0.5 font-medium underline decoration-dotted underline-offset-2 ${
              parte.startsWith(PREENCHIDO_ABRE)
                ? "bg-emerald-100 text-emerald-800 decoration-emerald-400 hover:bg-emerald-200"
                : "bg-red-100 text-red-700 decoration-red-400 hover:bg-red-200"
            }`}
          >
            {parte.replace(MARCAS, "")}
          </button>
        ) : (
          parte
        ),
      )}
    </>
  );
}

/** `**x**` em negrito. O split por `**` deixa os trechos em negrito nos
 *  índices ímpares — asterisco solto e sem par fica como texto, que é o
 *  comportamento menos surpreendente num contrato. */
function Inline({
  text,
  onPlaceholder,
}: {
  text: string;
  onPlaceholder?: Marcar;
}) {
  const partes = text.split("**");
  return (
    <>
      {partes.map((parte, indice) =>
        indice % 2 === 1 ? (
          <strong key={indice} className="font-semibold">
            <Trecho text={parte} onPlaceholder={onPlaceholder} />
          </strong>
        ) : (
          <span key={indice}>
            <Trecho text={parte} onPlaceholder={onPlaceholder} />
          </span>
        ),
      )}
    </>
  );
}
