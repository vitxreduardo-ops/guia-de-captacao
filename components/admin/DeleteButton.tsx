"use client";

export function DeleteButton({
  label = "Excluir",
  confirmMessage,
}: {
  label?: string;
  confirmMessage: string;
}) {
  return (
    <button
      type="submit"
      className="text-sm text-red-500 hover:text-red-700"
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
