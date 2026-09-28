import type { MetadataRoute } from "next";

/**
 * Existe pro iPhone: só com o painel adicionado à Tela de Início, aberto como
 * app (`standalone`), o iOS entrega notificações push.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Guia de Captação",
    short_name: "Tatú",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    background_color: "#f5f5f5",
    theme_color: "#ffffff",
    icons: [{ src: "/apple-icon", sizes: "180x180", type: "image/png" }],
  };
}
