import { contractBlocks } from "@/lib/contractBody";

/**
 * O corpo do contrato, já com as variáveis trocadas, desenhado na tela.
 *
 * Markdown suficiente pro que os modelos usam: `##` vira título e `**x**`
 * vira negrito. Uma biblioteca de Markdown resolveria o resto do CommonMark,
 * que nenhum contrato daqui escreve — e traria HTML arbitrário vindo de um
 * campo de texto para uma página pública. Aqui nada vira HTML: o texto entra
 * como texto, em nós React.
 */
export function ContractBody({ text }: { text: string }) {
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

        return (
          <p
            key={indice}
            className="text-sm leading-relaxed whitespace-pre-line text-[var(--tatu-ink)]/85"
          >
            <Inline text={limpo} />
          </p>
        );
      })}
    </div>
  );
}

/** `**x**` em negrito. O split por `**` deixa os trechos em negrito nos
 *  índices ímpares — asterisco solto e sem par fica como texto, que é o
 *  comportamento menos surpreendente num contrato. */
function Inline({ text }: { text: string }) {
  const partes = text.split("**");
  return (
    <>
      {partes.map((parte, indice) =>
        indice % 2 === 1 ? (
          <strong key={indice} className="font-semibold">
            {parte}
          </strong>
        ) : (
          <span key={indice}>{parte}</span>
        )
      )}
    </>
  );
}
