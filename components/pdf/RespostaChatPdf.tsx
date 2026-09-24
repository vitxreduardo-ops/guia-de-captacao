import { Document, Page, Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { LOGO_PATH, LOGO_VIEWBOX } from "@/components/pdf/tatuLogo";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", color: "#171717" },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderBottom: "0.5pt solid #e5e5e5",
    paddingBottom: 12,
    marginBottom: 24,
  },
  data: { fontSize: 8, color: "#737373", textTransform: "uppercase", letterSpacing: 1 },
  rotulo: { fontSize: 8, color: "#737373", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  pergunta: { fontSize: 14, fontWeight: 700, lineHeight: 1.4, marginBottom: 20 },
  resposta: { lineHeight: 1.6, marginBottom: 10 },
});

/** Uma resposta do chat de roteiros, baixada pelo botão "PDF". */
export default function RespostaChatPdf({
  pergunta,
  resposta,
  data,
}: {
  pergunta: string;
  resposta: string;
  data: string;
}) {
  return (
    <Document title={pergunta.slice(0, 80) || "Roteiro"} author="Tatú Estúdio Criativo">
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Svg viewBox={LOGO_VIEWBOX} style={{ width: 130, height: 25 }}>
            <Path d={LOGO_PATH} fill="#000000" />
          </Svg>
          <Text style={styles.data}>{data}</Text>
        </View>

        {pergunta ? (
          <View>
            <Text style={styles.rotulo}>Pedido</Text>
            <Text style={styles.pergunta}>{pergunta}</Text>
          </View>
        ) : null}

        {/* Uma linha em branco vira um parágrafo: sem isso o react-pdf dá a
            altura de linha inteira a cada "\n" vazio e o respiro dobra. */}
        {resposta.split(/\n\s*\n/).map((paragrafo, i) => (
          <Text key={i} style={styles.resposta}>
            {paragrafo.trim()}
          </Text>
        ))}
      </Page>
    </Document>
  );
}
