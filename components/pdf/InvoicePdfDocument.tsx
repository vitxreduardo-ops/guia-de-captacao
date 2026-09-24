import {
  Document,
  Page,
  Text,
  View,
  Svg,
  Path,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { MonthlyInvoiceWithItems } from "@/lib/billingTypes";
import { formatBRL, lineTotalCents, monthLabel } from "@/lib/billingTypes";
import { LOGO_PATH, LOGO_VIEWBOX } from "@/components/pdf/tatuLogo";

/** Conta do estúdio. Muda aqui e muda em todo relatório daqui pra frente. */
const PAYMENT = [
  ["PIX", "53.107.038/0001-24"],
  ["Banco", "077 - Inter"],
  ["Agência", "0001"],
  ["Conta", "44940158-8"],
];

const styles = StyleSheet.create({
  // O rodapé e os dados de pagamento ficam ancorados no pé da folha, então a
  // margem de baixo precisa reservar o espaço deles.
  page: {
    padding: 40,
    paddingBottom: 170,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#171717",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderBottom: "0.5pt solid #e5e5e5",
    paddingBottom: 12,
    marginBottom: 20,
  },
  headerLabel: { fontSize: 8, color: "#737373", textTransform: "uppercase", letterSpacing: 1 },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  title: { fontSize: 15, fontWeight: 700 },
  total: { fontSize: 18, fontWeight: 700 },
  intro: { fontSize: 9.5, color: "#525252", lineHeight: 1.5, marginBottom: 18, maxWidth: 400 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    borderTop: "0.5pt solid #e5e5e5",
    paddingVertical: 7,
  },
  itemMain: { flex: 1, paddingRight: 10 },
  itemTitle: { fontSize: 10 },
  itemQty: { fontSize: 8, color: "#737373", width: 90, textAlign: "right" },
  itemTotal: { fontSize: 10, fontWeight: 700, width: 70, textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "1pt solid #171717",
    paddingTop: 8,
    marginTop: 2,
  },
  notes: { fontSize: 9, color: "#525252", marginTop: 14, lineHeight: 1.5 },
  payment: {
    position: "absolute",
    bottom: 80,
    left: 40,
    right: 40,
    padding: 12,
    border: "0.5pt solid #e5e5e5",
    borderRadius: 4,
  },
  paymentTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: "#737373",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  paymentRow: { flexDirection: "row", marginBottom: 3 },
  paymentLabel: { fontSize: 9, color: "#737373", width: 60 },
  paymentValue: { fontSize: 9.5 },
  closing: {
    marginTop: 26,
    paddingTop: 12,
    borderTop: "0.5pt solid #e5e5e5",
    fontSize: 9.5,
    color: "#404040",
    lineHeight: 1.5,
    maxWidth: 400,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#737373",
  },
});

/**
 * O snapshot guarda a linha como "Serviço — Título" (ver `closeMonth` em
 * `lib/billing.ts`). No relatório fica só o título: o nome do card costuma
 * repetir o do serviço ("Card — Card - Lado aracnídeo"), e o cliente não
 * precisa do nome interno do produto.
 */
export function deliveryTitle(description: string) {
  const separator = description.indexOf(" — ");
  return separator === -1 ? description : description.slice(separator + 3);
}

function InvoicePdfDocument({
  invoice,
  closing,
}: {
  invoice: MonthlyInvoiceWithItems;
  closing: string;
}) {
  const label = monthLabel(invoice.month);
  const items = [...invoice.items].sort((a, b) => a.position - b.position);
  // Linha em branco separa parágrafo, que é como se escreve num textarea.
  const paragraphs = closing
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <Document
      title={`Relatório de entregas ${invoice.client_name} ${invoice.month.slice(0, 7)}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Svg viewBox={LOGO_VIEWBOX} style={{ width: 150, height: 28 }}>
            <Path d={LOGO_PATH} fill="#000000" />
          </Svg>
          <Text style={styles.headerLabel}>Relatório de entregas</Text>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title}>
            {invoice.client_name} — {label}
          </Text>
          <Text style={styles.total}>{formatBRL(invoice.total_cents)}</Text>
        </View>

        <Text style={styles.intro}>
          Este é o detalhamento do que foi entregue em {label}. Ele acompanha a
          nota fiscal do mês e mostra item por item o que compõe o valor.
        </Text>

        {items.map((item) => (
          <View key={item.id} style={styles.item} wrap={false}>
            <View style={styles.itemMain}>
              <Text style={styles.itemTitle}>
                {deliveryTitle(item.description)}
              </Text>
            </View>
            <Text style={styles.itemQty}>
              {item.quantity} × {formatBRL(item.unit_price_cents)}
            </Text>
            <Text style={styles.itemTotal}>{formatBRL(lineTotalCents(item))}</Text>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text style={{ fontSize: 10, fontWeight: 700 }}>
            Total de {label}
          </Text>
          <Text style={{ fontSize: 12, fontWeight: 700 }}>
            {formatBRL(invoice.total_cents)}
          </Text>
        </View>

        {invoice.notes ? (
          <Text style={styles.notes}>{invoice.notes}</Text>
        ) : null}

        {paragraphs.length > 0 ? (
          <View style={styles.closing}>
            {paragraphs.map((paragraph, index) => (
              <Text key={paragraph} style={index > 0 ? { marginTop: 6 } : undefined}>
                {paragraph}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.payment} fixed>
          <Text style={styles.paymentTitle}>Dados para pagamento</Text>
          {PAYMENT.map(([label, value]) => (
            <View key={label} style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>{label}</Text>
              <Text style={styles.paymentValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text>Tatú Estúdio Criativo</Text>
          <Text>
            {invoice.client_name} · {label}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdfBuffer(
  invoice: MonthlyInvoiceWithItems,
  closing: string
) {
  return renderToBuffer(<InvoicePdfDocument invoice={invoice} closing={closing} />);
}
