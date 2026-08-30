import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Briefing — Tatú Estúdio Criativo",
  description:
    "Conte pra Tatú Estúdio Criativo o que você precisa. Leva uns minutos, e eu respondo pelo WhatsApp.",
};

export default function BriefingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
