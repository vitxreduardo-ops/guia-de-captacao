import path from "path";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  Link,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { BudgetWithSections } from "@/lib/budgets";
import { PACKAGE_WHATSAPP_URL } from "@/lib/budgetCalc";
import { toPdfSafeImageUrl } from "@/lib/references";
import {
  visibleSections,
  type ListSectionData,
  type SectionData,
  type SectionKind,
} from "@/lib/budgetSections";

/** As quatro seções que são só uma lista de itens. */
const LIST_KINDS = [
  "package1",
  "package1Extra",
  "package2Perks",
  "strategy",
] as const;

Font.register({
  family: "Bootzy",
  src: path.join(process.cwd(), "public", "fonts", "BootzyTM.ttf"),
});

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#171717" },
  eyebrow: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1,
    color: "#666666",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  heroTitle: { fontFamily: "Bootzy", fontSize: 30, marginBottom: 4 },
  heroTitleBold: { fontFamily: "Bootzy", fontSize: 30, fontWeight: 700, marginBottom: 12 },
  subtitle: { fontSize: 11, color: "#525252", marginBottom: 20, maxWidth: 380 },
  sectionTitle: { fontSize: 15, fontWeight: 700, marginTop: 20, marginBottom: 10 },
  aboutText: { fontSize: 10, color: "#404040", lineHeight: 1.5, maxWidth: 420 },
  highlightsGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  highlightItem: { width: "50%", marginBottom: 14, paddingRight: 12 },
  highlightNum: { fontSize: 8, color: "#a3a3a3", marginBottom: 3 },
  highlightTitle: { fontSize: 11, fontWeight: 700 },
  referencesGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  referenceItem: { width: 110, marginRight: 10, marginBottom: 10 },
  referenceImage: { width: 110, height: 82, objectFit: "cover", borderRadius: 4 },
  referenceLinkBox: {
    width: 110,
    height: 82,
    borderRadius: 4,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  referenceLinkText: {
    fontSize: 8,
    color: "#2563eb",
    textDecoration: "underline",
    textAlign: "center",
  },
  referenceCaption: { fontSize: 8, color: "#666666", marginTop: 2 },
  packagesGrid: { flexDirection: "row", marginTop: 4 },
  packageCard: {
    flex: 1,
    marginRight: 10,
    padding: 12,
    border: "1pt solid #d4d4d4",
    borderRadius: 6,
  },
  packageCardHighlight: { border: "1.5pt solid #171717" },
  packageTag: {
    fontSize: 7,
    fontWeight: 700,
    backgroundColor: "#171717",
    color: "#ffffff",
    alignSelf: "flex-start",
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 3,
    marginBottom: 6,
  },
  packageName: { fontSize: 12, fontWeight: 700, marginBottom: 2 },
  packagePrice: { fontSize: 15, fontWeight: 700, marginBottom: 8 },
  packagePriceUnit: { fontSize: 8, fontWeight: 400, color: "#737373" },
  packageFeature: {
    fontSize: 8.5,
    color: "#525252",
    borderTop: "0.5pt solid #e5e5e5",
    paddingVertical: 3,
  },
  faqItem: { marginBottom: 10 },
  faqQuestion: { fontSize: 10.5, fontWeight: 700, marginBottom: 2 },
  faqAnswer: { fontSize: 9.5, color: "#525252", lineHeight: 1.4 },
  footer: {
    marginTop: 24,
    paddingTop: 10,
    borderTop: "0.5pt solid #e5e5e5",
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#737373",
  },
});

function money(n: number) {
  return "R$ " + (Number(n) || 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  });
}

function BudgetPdfDocument({ budget }: { budget: BudgetWithSections }) {
  // O PDF lê as mesmas seções da página, e na mesma ordem: seção desligada ou
  // vazia não sai aqui também. O desenho é outro — é papel —, mas o conteúdo é
  // o mesmo, então a proposta impressa nunca diverge da publicada.
  const visiveis = visibleSections(budget.sections);

  // O find já garante o kind; o cast só conta isso ao TypeScript, que não
  // consegue estreitar a união sozinho a partir de um parâmetro genérico.
  function secao<K extends SectionKind>(kind: K): SectionData[K] | undefined {
    const achada = visiveis.find((s) => s.kind === kind);
    return achada ? (achada.data as SectionData[K]) : undefined;
  }

  const cover = secao("cover");
  const about = secao("about");
  const portfolio = secao("portfolio");
  const pricing = secao("pricing");
  const faq = secao("faq");
  const listas = visiveis
    .filter((s) => LIST_KINDS.includes(s.kind as (typeof LIST_KINDS)[number]))
    .map((s) => ({ kind: s.kind, data: s.data as ListSectionData }));

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        {cover?.eyebrow ? (
          <Text style={styles.eyebrow}>{cover.eyebrow}</Text>
        ) : null}
        {cover?.title ? (
          <Text style={styles.heroTitleBold}>{cover.title}</Text>
        ) : null}
        {cover?.subtitle ? (
          <Text style={styles.subtitle}>{cover.subtitle}</Text>
        ) : null}

        {about ? (
          <View>
            {about.title ? (
              <Text style={styles.sectionTitle}>{about.title}</Text>
            ) : null}
            {about.text ? (
              <Text style={styles.aboutText}>{about.text}</Text>
            ) : null}
            {about.items.length > 0 ? (
              <View style={styles.highlightsGrid}>
                {about.items.map((item, index) => (
                  <View key={`${item}-${index}`} style={styles.highlightItem}>
                    <Text style={styles.highlightNum}>
                      {String(index + 1).padStart(2, "0")}
                    </Text>
                    <Text style={styles.highlightTitle}>{item}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {listas.map((lista) => (
          <View key={lista.kind}>
            {lista.data.title ? (
              <Text style={styles.sectionTitle}>{lista.data.title}</Text>
            ) : null}
            <View style={styles.highlightsGrid}>
              {lista.data.items.map((item, index) => (
                <View key={`${item}-${index}`} style={styles.highlightItem}>
                  <Text style={styles.highlightNum}>
                    {String(index + 1).padStart(2, "0")}
                  </Text>
                  <Text style={styles.highlightTitle}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {portfolio ? (
          <View>
            <Text style={styles.sectionTitle}>
              {portfolio.title || "Trabalhos selecionados"}
            </Text>
            <View style={styles.referencesGrid}>
              {portfolio.projects.map((projeto, index) => (
                <View key={`${projeto.url}-${index}`} style={styles.referenceItem}>
                  {projeto.mediaType === "image" ? (
                    <Link src={projeto.url}>
                      {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image is not an HTML img and has no alt prop */}
                      <Image
                        src={toPdfSafeImageUrl(projeto.url)}
                        style={styles.referenceImage}
                      />
                    </Link>
                  ) : (
                    // Vídeo não tem como virar papel: fica o link.
                    <Link src={projeto.url} style={styles.referenceLinkBox}>
                      <Text style={styles.referenceLinkText}>Ver vídeo</Text>
                    </Link>
                  )}
                  {projeto.name ? (
                    <Text style={styles.referenceCaption}>{projeto.name}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {pricing ? (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>
              {pricing.title || "Escolha a rota"}
            </Text>
            <View style={styles.packagesGrid}>
              {pricing.packages.map((pkg, index) => (
                <View
                  key={`${pkg.name}-${index}`}
                  style={
                    pkg.featured
                      ? { ...styles.packageCard, ...styles.packageCardHighlight }
                      : styles.packageCard
                  }
                >
                  {pkg.featured ? (
                    <Text style={styles.packageTag}>Recomendado</Text>
                  ) : null}
                  <Text style={styles.packageName}>{pkg.name}</Text>
                  <Text style={styles.packagePrice}>
                    {money(pkg.price)}
                    <Text style={styles.packagePriceUnit}>/mês</Text>
                  </Text>
                  {pkg.features.map((feature, i) => (
                    <Text key={i} style={styles.packageFeature}>
                      — {feature}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
            <Link src={PACKAGE_WHATSAPP_URL} style={{ fontSize: 8, color: "#2563eb", marginTop: 8 }}>
              {PACKAGE_WHATSAPP_URL}
            </Link>
          </View>
        ) : null}

        {faq ? (
          <View>
            <Text style={styles.sectionTitle}>
              {faq.title || "Perguntas frequentes"}
            </Text>
            {faq.items.map((item, index) => (
              <View key={`${item.question}-${index}`} style={styles.faqItem}>
                <Text style={styles.faqQuestion}>{item.question}</Text>
                {item.answer ? (
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text>{budget.client_name}</Text>
          <Text>Proposta gerada por Tatú Estúdio Criativo</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderBudgetPdfBuffer(budget: BudgetWithSections) {
  return renderToBuffer(<BudgetPdfDocument budget={budget} />);
}
