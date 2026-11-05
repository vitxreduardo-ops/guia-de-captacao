import type { MetadataRoute } from "next";

// Vale pro www. No sistema.* e no cliente.* o proxy responde "Disallow: /".
// Os links públicos de cliente (orçamento, contrato, galeria...) não entram
// aqui de propósito: bloqueados, o Google não veria o noindex que o proxy põe.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/cliente", "/api"] }],
    sitemap: "https://www.tatuestudio.com.br/sitemap.xml",
  };
}
