"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { AdminNavList } from "@/components/admin/AdminNavList";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Os mesmos atalhos no celular, onde a barra fixa não cabe. Gaveta pela
 * esquerda em vez de caixa no meio da tela: a lista tem doze itens e precisa
 * da altura toda.
 */
export function AdminMenuButton({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-label="Abrir atalhos"
        className="grid size-10 place-items-center rounded-md text-neutral-600 transition-transform hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95 lg:hidden"
      >
        <Menu aria-hidden="true" className="size-5" />
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 flex h-svh max-w-72 translate-x-0 translate-y-0 flex-col gap-0 overflow-y-auto rounded-none rounded-r-xl p-3 pt-4 sm:max-w-72 data-open:zoom-in-100 data-closed:zoom-out-100"
      >
        <DialogTitle className="px-2 pb-3 text-sm text-neutral-500">
          Atalhos
        </DialogTitle>
        <AdminNavList isAdmin={isAdmin} onNavigate={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
