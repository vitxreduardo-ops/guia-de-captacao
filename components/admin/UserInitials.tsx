/**
 * Seis tons bem separados — com mais cores que isso começam a entrar vizinhas
 * (violet/indigo, rose/fuchsia) que ninguém distingue numa bolinha de 20px.
 * Classes escritas por extenso porque o Tailwind varre o código como texto:
 * `bg-${cor}-100` montado em runtime não entra no CSS gerado.
 */
const PALETTE = [
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
];

/**
 * Cor derivada do nome, não sorteada: o mesmo usuário cai sempre na mesma cor,
 * no servidor e no cliente. Serve pra separar quem tem as mesmas iniciais
 * (vitor.tatu e vitoreduardo viram os dois "vi").
 */
function paletteFor(username: string) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = (hash * 31 + username.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

/**
 * Bolinha com as duas primeiras letras do usuário.
 *
 * `label` é o texto do tooltip (ex.: "Criada por vitor.tatu"); sem ele, o
 * tooltip é o próprio nome. Dentro de um botão que já tem `aria-label`, passe
 * `decorative` — senão o leitor de tela anuncia o nome duas vezes.
 */
export function UserInitials({
  username,
  label,
  decorative = false,
}: {
  username: string;
  label?: string;
  decorative?: boolean;
}) {
  const text = label ?? username;

  return (
    <span
      title={decorative ? undefined : text}
      aria-label={decorative ? undefined : text}
      aria-hidden={decorative || undefined}
      className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold uppercase ${paletteFor(
        username
      )}`}
    >
      {username.slice(0, 2)}
    </span>
  );
}
