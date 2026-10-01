import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import ChatRoteiro from "@/components/admin/roteiros/ChatRoteiro";
import { listGuideClientNames } from "@/lib/guides";

export default async function ChatRoteirosPage() {
  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <AdminHeader
        title="Chat de roteiros"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Roteiros", href: "/admin/roteiros" },
          { label: "Chat" },
        ]}
      />

      <div className="mb-4 flex justify-end">
        <Link
          href="/admin/roteiros"
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
        >
          Gerador
        </Link>
      </div>

      <ChatRoteiro clientes={(await listGuideClientNames()).map((c) => c.nome)} />
    </div>
  );
}
