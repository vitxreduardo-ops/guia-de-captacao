// Sem 0/O/1/l/I: a senha vai por WhatsApp e o cliente digita no celular.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** Senha legível de 8 caracteres (~40 bits), pro acesso do cliente. */
export function generatePassword(length = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
