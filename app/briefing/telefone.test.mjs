// Checagem do validador de telefone: node app/briefing/telefone.test.mjs
import { readFileSync } from "node:fs";
const ts = readFileSync(new URL("./fields.ts", import.meta.url), "utf8");
const fn = ts.slice(
  ts.indexOf("export function apenasDigitos"),
  ts.indexOf("export const FIELDS"),
);
const mod = await import(
  "data:text/javascript," +
    encodeURIComponent(fn.replace(/: string/g, "").replace(/: boolean/g, ""))
);
const casos = [
  ["11988881234", true],
  ["(11) 98888-1234", true],
  ["1132221234", true],
  ["5511988881234", true],
  ["abcdef", false],
  ["119888", false],
  ["119888812345", false],
  ["", false],
];
for (const [v, esperado] of casos) {
  const got = mod.telefoneValido(v);
  console.assert(
    got === esperado,
    `FALHOU ${JSON.stringify(v)}: ${got} != ${esperado}`,
  );
  console.log(
    `${got === esperado ? "ok " : "FALHOU"} ${JSON.stringify(v)} -> ${got}`,
  );
}
