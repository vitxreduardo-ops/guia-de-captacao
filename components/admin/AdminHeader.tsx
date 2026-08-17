import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { logout } from "@/app/admin/login/actions";
import { TatuLogo } from "@/components/TatuLogo";

export type BreadcrumbItem = {
  label: string;
  /** Sem href = página atual (último item da trilha). */
  href?: string;
};

export function AdminHeader({
  title,
  trail,
  username,
}: {
  title: string;
  trail?: BreadcrumbItem[];
  username?: string | null;
}) {
  return (
    <header className="mb-8">
      <TatuLogo className="mx-auto mb-4 block h-[30px] w-auto text-black" />
      {/* Trilha e ações ficam na chrome, acima da linha; o título respira
          embaixo dela. */}
      <div className="flex items-center justify-between gap-4 border-b border-neutral-200 pb-3">
        <div className="min-w-0">
          {trail?.length ? (
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1 text-[13px]">
                {trail.map((item, index) => (
                  <li key={item.label} className="flex items-center gap-1">
                    {index > 0 ? (
                      <ChevronRight
                        aria-hidden="true"
                        className="size-3.5 text-neutral-400"
                      />
                    ) : null}
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="rounded-md bg-neutral-100 px-2.5 py-1 text-neutral-600 hover:bg-neutral-200"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span
                        aria-current="page"
                        className="rounded-md bg-neutral-100 px-2.5 py-1 font-medium text-neutral-900"
                      >
                        {item.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2 text-sm text-neutral-500">
          {username ? <span>{username}</span> : null}
          <form action={logout}>
            <button
              type="submit"
              className="hover:text-neutral-800"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
      <h1 className="mt-5 text-xl leading-tight font-semibold text-neutral-900">
        {title}
      </h1>
    </header>
  );
}
