import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { logout } from "@/app/admin/login/actions";
import { LiveRefresh } from "@/components/admin/LiveRefresh";
import { TatuLogo } from "@/components/TatuLogo";

export type BreadcrumbItem = {
  label: string;
  /** Sem href = página atual (último item da trilha). */
  href?: string;
};

const FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none";

export function AdminHeader({
  title,
  trail,
  dense = false,
  standalone = false,
}: {
  title: string;
  trail?: BreadcrumbItem[];
  /**
   * Versão baixa do cabeçalho, pra tela que é ferramenta e não documento: o
   * título sai (a trilha já nomeia a página) e a folga encolhe, porque cada
   * faixa aqui em cima é faixa a menos pra área de trabalho no celular.
   */
  dense?: boolean;
  /**
   * Fora do layout do admin não existe barra lateral nem faixa de topo, então
   * o cabeçalho volta a carregar logo e Sair por conta própria. Dentro do
   * admin isso vive no layout, e repetir aqui seria a mesma coisa duas vezes.
   */
  standalone?: boolean;
}) {
  return (
    <header
      className={
        dense ? "mt-4 mb-3" : trail?.length ? "mt-6 mb-6" : "mt-8 mb-8"
      }
    >
      {/* Todo o admin fica montado sob este header, então é daqui que sai a
          sincronização com o que os outros usuários estão fazendo. */}
      <LiveRefresh />

      {standalone ? (
        <div className="mb-3 flex items-center justify-center gap-4">
          <Link
            href="/admin"
            aria-label="Ir para o Painel"
            className={`grid size-10 place-items-center rounded-md text-neutral-600 transition-transform hover:bg-neutral-100 hover:text-neutral-900 active:scale-95 ${FOCUS_RING}`}
          >
            <Home aria-hidden="true" className="size-5" />
          </Link>

          <TatuLogo className="block h-[26px] w-auto text-black" />

          <form action={logout}>
            <button
              type="submit"
              className={`flex h-10 items-center rounded-md border border-neutral-300 px-3 text-sm text-neutral-600 transition-transform hover:bg-neutral-50 hover:text-neutral-900 active:scale-95 ${FOCUS_RING}`}
            >
              Sair
            </button>
          </form>
        </div>
      ) : null}

      {/* A trilha nomeia onde a pessoa está — é a primeira linha da página
          agora que logo e conta saíram daqui pra moldura. */}
      {trail?.length ? (
        <nav aria-label="Breadcrumb" className={standalone ? "mt-4" : ""}>
          <ol className="flex flex-wrap items-center gap-1 text-[13px]">
            {trail.map((item, index) => (
              <li key={item.label} className="flex items-center gap-1">
                {index > 0 ? (
                  <ChevronRight
                    aria-hidden="true"
                    className="size-3.5 text-neutral-500"
                  />
                ) : null}
                {item.href ? (
                  <Link
                    href={item.href}
                    className={`flex items-center rounded-md bg-neutral-100 px-2.5 py-1 text-neutral-600 transition-transform hover:bg-neutral-200 active:scale-[0.97] pointer-coarse:min-h-11 ${FOCUS_RING}`}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-current="page"
                    className="flex items-center rounded-md bg-neutral-100 px-2.5 py-1 font-medium text-neutral-900 pointer-coarse:min-h-11"
                  >
                    {item.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      {/* Com trilha, o último item já nomeia a tela — o título visível seria
          a mesma palavra duas vezes. Some da tela, fica pro leitor. */}
      <h1
        className={
          dense || trail?.length
            ? "sr-only"
            : "text-xl leading-tight font-semibold tracking-tight text-neutral-900"
        }
      >
        {title}
      </h1>
    </header>
  );
}
