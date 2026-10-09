import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { contractBlocks, contractTable } from "@/lib/contractBody";

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingHorizontal: 56,
    paddingBottom: 64,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#171717",
    lineHeight: 1.45,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderBottom: "0.5pt solid #d4d4d4",
    paddingBottom: 12,
    marginBottom: 22,
  },
  eyebrow: {
    fontSize: 8,
    color: "#737373",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: { fontSize: 16, fontWeight: 700, marginTop: 3 },
  clause: { fontSize: 11.5, fontWeight: 700, marginTop: 16, marginBottom: 6 },
  paragraph: { marginBottom: 6, textAlign: "justify" },
  bullet: { flexDirection: "row", marginBottom: 3, paddingLeft: 8 },
  bulletMark: { width: 10 },
  bulletText: { flex: 1 },
  table: { marginVertical: 6, borderTop: "0.5pt solid #a3a3a3" },
  row: { flexDirection: "row", borderBottom: "0.5pt solid #a3a3a3" },
  cell: {
    flex: 1,
    padding: 4,
    fontSize: 8.5,
    borderLeft: "0.5pt solid #a3a3a3",
  },
  cellLast: { borderRight: "0.5pt solid #a3a3a3" },
  headCell: { backgroundColor: "#f5f5f5", fontWeight: 700 },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 56,
    right: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#737373",
  },
});

/** A fonte padrão do PDF (Helvetica) não tem a seta. */
const paraPdf = (texto: string) => texto.replace(/→/g, "->");

/** `**x**` em negrito, no mesmo critério da tela: os trechos ímpares do split
 *  são o negrito, e asterisco sem par fica como texto. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {paraPdf(text)
        .split("**")
        .map((parte, i) =>
          i % 2 === 1 ? (
            <Text key={i} style={{ fontWeight: 700 }}>
              {parte}
            </Text>
          ) : (
            parte
          ),
        )}
    </>
  );
}

function Block({ bloco }: { bloco: string }) {
  if (bloco.startsWith("## ")) {
    return (
      <Text style={styles.clause} minPresenceAhead={60}>
        {paraPdf(bloco.slice(3))}
      </Text>
    );
  }

  const tabela = contractTable(bloco);
  if (tabela) {
    const colunas = Math.max(...tabela.map((r) => r.length));
    return (
      <View style={styles.table}>
        {/* Cabeçalho e primeira linha andam juntos: cabeçalho sozinho no pé da
            página não diz nada. */}
        {[tabela.slice(0, 2), ...tabela.slice(2).map((l) => [l])].map(
          (grupo, g) => (
            <View key={g} wrap={false}>
              {grupo.map((linha, k) => {
                const r = g === 0 ? k : g + 1;
                return (
                  <View key={k} style={styles.row}>
                    {Array.from({ length: colunas }, (_, c) => (
                      <Text
                        key={c}
                        style={[
                          styles.cell,
                          c === colunas - 1 ? styles.cellLast : {},
                          r === 0 ? styles.headCell : {},
                        ]}
                      >
                        <Inline text={linha[c] ?? ""} />
                      </Text>
                    ))}
                  </View>
                );
              })}
            </View>
          ),
        )}
      </View>
    );
  }

  const linhas = bloco.split("\n");
  if (linhas.every((l) => l.startsWith("- "))) {
    return (
      <View style={{ marginBottom: 4 }}>
        {linhas.map((l, i) => (
          <View key={i} style={styles.bullet} wrap={false}>
            <Text style={styles.bulletMark}>•</Text>
            <Text style={styles.bulletText}>
              <Inline text={l.slice(2)} />
            </Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <Text style={styles.paragraph}>
      <Inline text={bloco} />
    </Text>
  );
}

export function ContractPdfDocument({
  title,
  eyebrow,
  text,
}: {
  title: string;
  eyebrow: string;
  /** O corpo já pronto: variáveis trocadas e o que está desligado fora. */
  text: string;
}) {
  return (
    <Document title={title} author="Tatú Estúdio Criativo">
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed={false}>
          <View>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text style={styles.title}>{paraPdf(title)}</Text>
          </View>
        </View>

        {contractBlocks(text).map((bloco, i) => (
          <Block key={i} bloco={bloco} />
        ))}

        <View style={styles.footer} fixed>
          <Text>{paraPdf(title)}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export function renderContractPdfBuffer(props: {
  title: string;
  eyebrow: string;
  text: string;
}) {
  return renderToBuffer(<ContractPdfDocument {...props} />);
}
