import {
  Document,
  Page,
  Text,
  View,
  Image,
  Link,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { GuideWithSections } from "@/lib/guides";
import { isLikelyImageUrl } from "@/lib/references";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 18, marginBottom: 4 },
  meta: { fontSize: 10, color: "#666666", marginBottom: 16 },
  sectionTitle: {
    fontSize: 13,
    marginTop: 16,
    marginBottom: 8,
    fontWeight: 700,
  },
  videoBox: {
    marginBottom: 10,
    padding: 8,
    border: "1pt solid #bbbbbb",
    borderRadius: 4,
  },
  videoTitle: {
    fontSize: 12,
    marginBottom: 6,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  sceneBox: {
    marginBottom: 8,
    padding: 8,
    border: "1pt solid #dddddd",
    borderRadius: 4,
  },
  sceneTitle: { fontSize: 11, marginBottom: 4, fontWeight: 700 },
  sceneScript: { fontSize: 10, color: "#333333" },
  referencesGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  referenceItem: { width: 90, marginRight: 8, marginBottom: 8 },
  referenceImage: { width: 90, height: 68, objectFit: "cover", borderRadius: 4 },
  referenceLinkBox: {
    width: 90,
    height: 68,
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
  table: { width: "100%" },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottom: "1pt solid #333333",
    paddingVertical: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1pt solid #eeeeee",
    paddingVertical: 4,
  },
  colIndex: { width: "6%", fontSize: 9 },
  colDescription: { width: "34%", fontSize: 9 },
  colType: { width: "20%", fontSize: 9 },
  colDuration: { width: "15%", fontSize: 9 },
  colNotes: { width: "25%", fontSize: 9 },
  checklistColumns: { flexDirection: "row" },
  checklistColumn: { flex: 1, marginRight: 16 },
  checklistHeading: { fontSize: 10, fontWeight: 700, marginBottom: 4 },
  checklistItem: { fontSize: 10, marginBottom: 2 },
});

function GuidePdfDocument({ guide }: { guide: GuideWithSections }) {
  const equipamento = guide.checklist_items.filter(
    (item) => item.category === "equipamento"
  );
  const locacao = guide.checklist_items.filter(
    (item) => item.category === "locacao"
  );

  const metaParts = [
    guide.client_name ? `Cliente: ${guide.client_name}` : null,
    guide.shoot_date ? `Data: ${guide.shoot_date}` : null,
    guide.location ? `Local: ${guide.location}` : null,
  ].filter(Boolean);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>{guide.title}</Text>
        {metaParts.length > 0 ? (
          <Text style={styles.meta}>{metaParts.join("   ·   ")}</Text>
        ) : null}

        {guide.videos.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Vídeos</Text>
            {guide.videos.map((video, videoIndex) => (
              <View
                key={video.id}
                style={styles.videoBox}
                break={videoIndex > 0}
              >
                <Text style={styles.videoTitle}>
                  Vídeo {videoIndex + 1}
                  {video.title ? ` — ${video.title}` : ""}
                </Text>

                {video.scenes.map((scene, sceneIndex) => {
                  const sceneReferences = guide.visual_references.filter(
                    (reference) => reference.scene_id === scene.id
                  );
                  return (
                    <View key={scene.id} style={styles.sceneBox} wrap={false}>
                      <Text style={styles.sceneTitle}>
                        Cena {sceneIndex + 1}
                        {scene.title ? ` — ${scene.title}` : ""}
                      </Text>
                      <Text style={styles.sceneScript}>
                        {scene.script || "-"}
                      </Text>

                      {sceneReferences.length > 0 ? (
                        <View style={styles.referencesGrid}>
                          {sceneReferences.map((reference) => (
                            <View
                              key={reference.id}
                              style={styles.referenceItem}
                            >
                              {isLikelyImageUrl(reference.image_url) ? (
                                <Link src={reference.image_url}>
                                  {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image is not an HTML img and has no alt prop */}
                                  <Image
                                    src={reference.image_url}
                                    style={styles.referenceImage}
                                  />
                                </Link>
                              ) : (
                                <Link
                                  src={reference.image_url}
                                  style={styles.referenceLinkBox}
                                >
                                  <Text style={styles.referenceLinkText}>
                                    Abrir link
                                  </Text>
                                </Link>
                              )}
                              {reference.caption ? (
                                <Text style={styles.referenceCaption}>
                                  {reference.caption}
                                </Text>
                              ) : null}
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        ) : null}

        {guide.shot_list_items.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Shot list / decupagem</Text>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={styles.colIndex}>#</Text>
                <Text style={styles.colDescription}>Plano</Text>
                <Text style={styles.colType}>Tipo</Text>
                <Text style={styles.colDuration}>Duração</Text>
                <Text style={styles.colNotes}>Obs.</Text>
              </View>
              {guide.shot_list_items.map((item, index) => (
                <View key={item.id} style={styles.tableRow}>
                  <Text style={styles.colIndex}>{index + 1}</Text>
                  <Text style={styles.colDescription}>{item.description}</Text>
                  <Text style={styles.colType}>{item.shot_type || "-"}</Text>
                  <Text style={styles.colDuration}>{item.duration || "-"}</Text>
                  <Text style={styles.colNotes}>{item.notes || "-"}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {equipamento.length > 0 || locacao.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Checklist</Text>
            <View style={styles.checklistColumns}>
              {equipamento.length > 0 ? (
                <View style={styles.checklistColumn}>
                  <Text style={styles.checklistHeading}>Equipamento</Text>
                  {equipamento.map((item) => (
                    <Text key={item.id} style={styles.checklistItem}>
                      {item.done ? "[x] " : "[ ] "}
                      {item.label}
                    </Text>
                  ))}
                </View>
              ) : null}
              {locacao.length > 0 ? (
                <View style={styles.checklistColumn}>
                  <Text style={styles.checklistHeading}>Locação</Text>
                  {locacao.map((item) => (
                    <Text key={item.id} style={styles.checklistItem}>
                      {item.done ? "[x] " : "[ ] "}
                      {item.label}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

export async function renderGuidePdfBuffer(guide: GuideWithSections) {
  return renderToBuffer(<GuidePdfDocument guide={guide} />);
}
