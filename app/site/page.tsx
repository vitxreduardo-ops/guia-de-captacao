import { Archivo } from "next/font/google";
import Site from "@/components/site/Site";
import LoginForm from "@/app/admin/login/LoginForm";
import { CONFIG, whatsappUrl } from "@/components/site/config";

const SITE = "https://www.tatuestudio.com.br/";
const DESCRICAO = "Tatu Estúdio Criativo: estúdio de vídeo, arte e estratégia em Luís Eduardo Magalhães, Bahia.";

export const metadata = {
  title: "Tatu Estúdio Criativo",
  description: DESCRICAO,
  // O mesmo site também abre no login do sistema.*; o endereço oficial é o www.
  alternates: { canonical: SITE },
  openGraph: { url: SITE },
};

// Ficha do negócio pro Google e pras IAs: quem é, o que faz, onde atende.
const FICHA = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Tatu Estúdio Criativo",
  url: SITE,
  description: DESCRICAO,
  image: `${SITE}opengraph-image`,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Luís Eduardo Magalhães",
    addressRegion: "BA",
    addressCountry: "BR",
  },
  areaServed: { "@type": "City", name: "Luís Eduardo Magalhães" },
  knowsAbout: ["Produção de vídeo", "Direção de arte", "Identidade visual", "Estratégia de marca", "Edição e motion"],
  sameAs: [
    CONFIG.instagram && `https://instagram.com/${CONFIG.instagram}`,
    CONFIG.youtube,
    CONFIG.vimeo,
  ].filter(Boolean),
  contactPoint: { "@type": "ContactPoint", contactType: "customer service", url: whatsappUrl() },
};

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo" });

type SearchParams = Promise<{ error?: string; next?: string }>;

/**
 * Site do estúdio. Fica fora de /admin pra não herdar a moldura do painel; o
 * proxy mostra esta página no lugar do login (menos no cliente.*). O único
 * laço com o sistema é o formulário do bloco "Entrar".
 */
export default async function SitePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = params.next ?? "/admin";

  const errorMessage =
    params.error === "config"
      ? "ADMIN_PASSWORD não está configurado no servidor."
      : params.error === "limite"
      ? "Muitas tentativas. Espere 15 minutos e tente de novo."
      : params.error
      ? "Usuário ou senha incorretos."
      : null;

  return (
    <div className={`site relative isolate ${archivo.variable}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FICHA).replace(/</g, "\\u003c") }}
      />
      <Site
        login={<LoginForm next={next} errorMessage={errorMessage} />}
        abrirLogin={errorMessage !== null}
      />
    </div>
  );
}
