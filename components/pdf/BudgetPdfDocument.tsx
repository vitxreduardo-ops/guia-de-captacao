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
import { isLikelyImageUrl } from "@/lib/references";

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
  const highlights = budget.highlights;
  const references = budget.references;
  const packages = budget.packages;
  const faq = budget.faq;
  const hasAbout = Boolean(budget.about_title || budget.about_text);

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        {budget.hero_eyebrow ? (
          <Text style={styles.eyebrow}>{budget.hero_eyebrow}</Text>
        ) : null}
        <Text style={styles.heroTitle}>{budget.hero_title1}</Text>
        <Text style={styles.heroTitleBold}>{budget.hero_title2}</Text>
        {budget.hero_subtitle ? (
          <Text style={styles.subtitle}>{budget.hero_subtitle}</Text>
        ) : null}

        {hasAbout ? (
          <View>
            {budget.about_title ? (
              <Text style={styles.sectionTitle}>{budget.about_title}</Text>
            ) : null}
            {budget.about_text ? (
              <Text style={styles.aboutText}>{budget.about_text}</Text>
            ) : null}
          </View>
        ) : null}

        {highlights.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>
              {budget.highlights_title || "O que você recebe"}
            </Text>
            <View style={styles.highlightsGrid}>
              {highlights.map((item, index) => (
                <View key={item.id} style={styles.highlightItem}>
                  <Text style={styles.highlightNum}>
                    {String(index + 1).padStart(2, "0")}
                  </Text>
                  <Text style={styles.highlightTitle}>{item.title}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {references.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Referências</Text>
            <View style={styles.referencesGrid}>
              {references.map((item) => {
                const showAsImage =
                  Boolean(item.source_url) || isLikelyImageUrl(item.image_url);
                const href = item.source_url ?? item.image_url;

                return (
                  <View key={item.id} style={styles.referenceItem}>
                    {showAsImage ? (
                      <Link src={href}>
                        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image is not an HTML img and has no alt prop */}
                        <Image
                          src={item.image_url}
                          style={styles.referenceImage}
                        />
                      </Link>
                    ) : (
                      <Link src={href} style={styles.referenceLinkBox}>
                        <Text style={styles.referenceLinkText}>
                          Abrir link
                        </Text>
                      </Link>
                    )}
                    {item.caption ? (
                      <Text style={styles.referenceCaption}>
                        {item.caption}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {packages.length > 0 ? (
          <View wrap={false}>
            <Text style={styles.sectionTitle}>
              Três formatos. Uma decisão de posicionamento.
            </Text>
            <View style={styles.packagesGrid}>
              {packages.map((pkg) => {
                const features = pkg.features
                  .split("\n")
                  .map((f) => f.trim())
                  .filter(Boolean);
                return (
                  <View
                    key={pkg.id}
                    style={
                      pkg.tag
                        ? { ...styles.packageCard, ...styles.packageCardHighlight }
                        : styles.packageCard
                    }
                  >
                    {pkg.tag ? (
                      <Text style={styles.packageTag}>{pkg.tag}</Text>
                    ) : null}
                    <Text style={styles.packageName}>{pkg.name}</Text>
                    <Text style={styles.packagePrice}>
                      {money(pkg.price)}
                      <Text style={styles.packagePriceUnit}>/mês</Text>
                    </Text>
                    {features.map((feature, i) => (
                      <Text key={i} style={styles.packageFeature}>
                        — {feature}
                      </Text>
                    ))}
                  </View>
                );
              })}
            </View>
            <Link src={PACKAGE_WHATSAPP_URL} style={{ fontSize: 8, color: "#2563eb", marginTop: 8 }}>
              {PACKAGE_WHATSAPP_URL}
            </Link>
          </View>
        ) : null}

        {faq.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Perguntas frequentes</Text>
            {faq.map((item) => (
              <View key={item.id} style={styles.faqItem}>
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
