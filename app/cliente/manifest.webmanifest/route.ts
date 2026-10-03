/**
 * Manifesto do portal: é o que faz o ícone da Tela de Início abrir direto no
 * portal do cliente (e o que o iPhone exige para entregar notificações).
 */
export function GET() {
  return Response.json(
    {
      name: "Portal do cliente — Tatú Estúdio Criativo",
      short_name: "Tatú",
      start_url: "/cliente",
      scope: "/",
      display: "standalone",
      background_color: "#fff6e3",
      theme_color: "#fff6e3",
      icons: [{ src: "/apple-icon", sizes: "180x180", type: "image/png" }],
    },
    { headers: { "Content-Type": "application/manifest+json" } }
  );
}
