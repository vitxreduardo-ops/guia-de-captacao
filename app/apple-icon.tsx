import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Ícone da Tela de Início no iPhone: um "T" preto em fundo branco. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          color: "#000000",
          fontSize: 120,
          fontWeight: 700,
        }}
      >
        T
      </div>
    ),
    size
  );
}
