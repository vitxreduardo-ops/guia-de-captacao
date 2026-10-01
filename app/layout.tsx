import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Telas de iPhone em pé: [largura, altura, densidade]. */
const SPLASH_SCREENS: [number, number, number][] = [
  [440, 956, 3], // 16/17 Pro Max
  [402, 874, 3], // 16/17 Pro, 17
  [420, 912, 3], // Air
  [430, 932, 3], // 14/15 Pro Max, 15/16 Plus
  [393, 852, 3], // 14/15 Pro, 15, 16
  [428, 926, 3], // 12/13 Pro Max, 14 Plus
  [390, 844, 3], // 12, 13, 14
  [375, 812, 3], // X, XS, 11 Pro, mini
  [414, 896, 3], // XS Max, 11 Pro Max
  [414, 896, 2], // XR, 11
  [375, 667, 2], // SE, 8
];

export const metadata: Metadata = {
  title: "Guia de Captação",
  description: "Guias de gravação: roteiros, referências e checklist por projeto.",
  // Aberto pela Tela de Início do iPhone, vira app sem a barra do Safari —
  // condição do iOS pra entregar notificações push.
  appleWebApp: {
    capable: true,
    title: "Tatú",
    // Sem isto o app instalado abre numa tela branca até o painel carregar.
    // O iOS só usa a imagem com o tamanho exato da tela, então vai uma por
    // aparelho (largura × altura em pontos, densidade).
    startupImage: SPLASH_SCREENS.map(([w, h, dpr]) => ({
      url: `/splash?w=${w * dpr}&h=${h * dpr}`,
      media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`,
    })),
  },
};

/**
 * `viewportFit: "cover"` é o que faz `env(safe-area-inset-*)` valer alguma
 * coisa: sem ele o iOS resolve todos os insets como 0 e as barras fixas
 * ficam por baixo do indicador de home / do notch.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
