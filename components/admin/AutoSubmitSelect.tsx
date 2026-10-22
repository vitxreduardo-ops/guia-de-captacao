"use client";

/** Select que envia o formulário assim que a escolha muda: um passo a menos. */
export function AutoSubmitSelect({
  name,
  defaultValue,
  children,
  className = "rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm",
}: {
  name: string;
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className={className}
    >
      {children}
    </select>
  );
}
