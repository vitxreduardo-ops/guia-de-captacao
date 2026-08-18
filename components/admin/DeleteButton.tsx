"use client";

export function DeleteButton({
  label = "Excluir",
  ariaLabel,
  className = "text-sm text-red-500 hover:text-red-700",
  confirmMessage,
}: {
  label?: React.ReactNode;
  /** Necessário quando o label é um ícone/símbolo, não texto legível. */
  ariaLabel?: string;
  className?: string;
  confirmMessage: string;
}) {
  return (
    <button
      type="submit"
      aria-label={ariaLabel}
      title={ariaLabel}
      className={className}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {label}
    </button>
  );
}
