import { cloneElement } from "react";
import { ImageResponse } from "next/og";
import { TatuLogo } from "@/components/TatuLogo";

/**
 * Tela de abertura do app instalado no iPhone. O iOS só mostra a imagem se
 * ela tiver exatamente o tamanho em pixels da tela, então o tamanho vem na
 * URL (`?w=1179&h=2556`) e a lista de aparelhos fica em `app/layout.tsx`.
 */
export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  // Limite pra ninguém pedir uma imagem gigante e ocupar o servidor.
  const width = Math.min(Number(params.get("w")) || 1179, 3000);
  const height = Math.min(Number(params.get("h")) || 2556, 3000);
  const logoWidth = Math.round(width * 0.5);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f2ec",
          color: "#1e1c18",
        }}
      >
        {/* O gerador de imagem só desenha SVG com largura e altura
            explícitas; o componente do logo não recebe tamanho. */}
        {cloneElement(TatuLogo({}), {
          width: logoWidth,
          height: Math.round((logoWidth * 43) / 227),
        })}
      </div>
    ),
    {
      width,
      height,
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    }
  );
}
