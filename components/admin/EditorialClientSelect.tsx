"use client";

import { useRouter } from "next/navigation";

export function EditorialClientSelect({
  clients,
  current,
}: {
  clients: { id: string; name: string }[];
  current: string;
}) {
  const router = useRouter();
  return (
    <select
      value={current}
      aria-label="Cliente"
      onChange={(e) => router.push(`/admin/clientes/calendario?cliente=${e.target.value}`)}
      className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium"
    >
      {clients.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
