import { Archivo } from "next/font/google";
import Site from "@/components/site/Site";
import LoginForm from "@/app/admin/login/LoginForm";

export const metadata = {
  title: "Tatu Estúdio Criativo",
  description: "Tatu Estúdio Criativo: estúdio de vídeo, arte e estratégia em Luís Eduardo Magalhães, Bahia.",
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
    <div className={`site ${archivo.variable}`}>
      <Site
        login={<LoginForm next={next} errorMessage={errorMessage} />}
        abrirLogin={errorMessage !== null}
      />
    </div>
  );
}
