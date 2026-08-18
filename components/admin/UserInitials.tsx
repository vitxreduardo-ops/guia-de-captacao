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
 * Bolinha com as duas primeiras letras do usuário. O `label` é o que aparece
 * no tooltip do hover (ex.: "Criada por vitor.tatu") — sem ele, o tooltip é só
 * o nome.
 */
export function UserInitials({
  username,
  label,
}: {
  username: string;
  label?: string;
}) {
  const text = label ?? username;

  return (
    <span
      title={text}
      aria-label={text}
      className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold uppercase ${paletteFor(
        username
      )}`}
    >
      {username.slice(0, 2)}
    </span>
  );
}
