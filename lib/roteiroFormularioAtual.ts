import { useSyncExternalStore } from "react";

// O gerador e o chat ficam lado a lado na mesma página, mas em árvores
// separadas: o gerador publica aqui o resumo do formulário e o chat lê.
// Só existe enquanto o gerador está montado (sair da página apaga o form).
let atual = "";
const ouvintes = new Set<() => void>();

export function publicarFormulario(texto: string) {
  if (texto === atual) return;
  atual = texto;
  ouvintes.forEach((o) => o());
}

export function useFormularioAtual() {
  return useSyncExternalStore(
    (o) => {
      ouvintes.add(o);
      return () => ouvintes.delete(o);
    },
    () => atual,
    () => ""
  );
}
