import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Tatú Estúdio";

/**
 * A imagem que WhatsApp, iMessage e redes sociais mostram no preview do link.
 * Sem ela o WhatsApp cai no ícone do app — um quadradinho — em vez do card
 * grande. Os SVGs entram como data URI porque o satori (quem desenha isto)
 * aceita `<img>`, não `<svg>` montado em JSX.
 */
const dataUri = (file: string) =>
  `data:image/svg+xml;base64,${readFileSync(
    join(process.cwd(), "app", file)
  ).toString("base64")}`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 56,
          background: "#fff6e3",
        }}
      >
        { }
        <img src={dataUri("icon.svg")} width={320} height={320} alt="" />
        { }
        <img src={dataUri("_brand/wordmark.svg")} width={560} height={106} alt="" />
      </div>
    ),
    size
  );
}
