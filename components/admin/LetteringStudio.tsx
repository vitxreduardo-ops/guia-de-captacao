"use client";

import { Download, Type, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/** O PNG sai em 3x pra dar resolução de story sem precisar pedir o tamanho. */
const EXPORT_SCALE = 3;

const SYSTEM_FONTS = [
  { family: "Georgia, serif", label: "Georgia" },
  { family: "Helvetica, Arial, sans-serif", label: "Helvetica" },
  { family: "'Times New Roman', serif", label: "Times" },
  { family: "'Courier New', monospace", label: "Courier" },
  { family: "Impact, sans-serif", label: "Impact" },
];

const INPUT =
  "w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none";

const LABEL = "block text-sm font-medium text-neutral-700";

/** Xadrez de fundo: é assim que se enxerga que o PNG saiu mesmo transparente. */
const CHECKERBOARD =
  "repeating-conic-gradient(#e5e5e5 0% 25%, #ffffff 0% 50%) 50% / 16px 16px";

export function LetteringStudio() {
  const [text, setText] = useState("Seu lettering aqui");
  const [fonts, setFonts] = useState(SYSTEM_FONTS);
  const [family, setFamily] = useState(SYSTEM_FONTS[0].family);
  const [size, setSize] = useState(120);
  const [color, setColor] = useState("#111111");
  const [align, setAlign] = useState<"left" | "center" | "right">("center");
  const [lineHeight, setLineHeight] = useState(1.1);
  const [tracking, setTracking] = useState(0);
  const [fontError, setFontError] = useState<string | null>(null);
  const [png, setPng] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const lines = text.split("\n");
    const font = `${size}px ${family}`;

    // Fonte recém-carregada só mede certo depois que o navegador confirma que
    // ela está pronta — sem isso a primeira medição sai com a fonte de sistema.
    let cancelled = false;
    document.fonts.load(font).then(() => {
      if (cancelled) return;

      ctx.letterSpacing = `${tracking}px`;
      ctx.font = font;

      const metrics = lines.map((line) => ctx.measureText(line || " "));
      // actualBoundingBox e não .width: itálico, swash e perna de "Q" saem da
      // caixa do avanço e seriam cortados no recorte justo.
      const width = Math.max(
        ...metrics.map((m) => m.actualBoundingBoxLeft + m.actualBoundingBoxRight),
        ...metrics.map((m) => m.width),
        1,
      );
      const step = size * lineHeight;
      const ascent = metrics[0].actualBoundingBoxAscent;
      const descent = metrics[metrics.length - 1].actualBoundingBoxDescent;
      const pad = size * 0.15;
      const height = (lines.length - 1) * step + ascent + descent;

      canvas.width = Math.ceil((width + pad * 2) * EXPORT_SCALE);
      canvas.height = Math.ceil((height + pad * 2) * EXPORT_SCALE);

      // Redimensionar o canvas zera o contexto, então tudo é reaplicado aqui.
      ctx.scale(EXPORT_SCALE, EXPORT_SCALE);
      ctx.letterSpacing = `${tracking}px`;
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.textBaseline = "alphabetic";

      const x =
        align === "left" ? pad : align === "right" ? pad + width : pad + width / 2;

      lines.forEach((line, i) => {
        ctx.fillText(line, x, pad + ascent + i * step);
      });

      setPng(canvas.toDataURL("image/png"));
    });

    return () => {
      cancelled = true;
    };
  }, [text, family, size, color, align, lineHeight, tracking]);

  async function loadFont(file: File) {
    setFontError(null);
    const label = file.name.replace(/\.[^.]+$/, "");
    const custom = `lettering-${label.replace(/[^a-zA-Z0-9]/g, "-")}-${Date.now()}`;
    try {
      const face = new FontFace(custom, await file.arrayBuffer());
      await face.load();
      document.fonts.add(face);
      setFonts((current) => [...current, { family: `"${custom}"`, label }]);
      setFamily(`"${custom}"`);
    } catch {
      setFontError("Não deu pra ler essa fonte. Use .ttf, .otf ou .woff2.");
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(280px,360px)_1fr]">
      <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="space-y-1.5">
          <label className={LABEL} htmlFor="lettering-text">
            Texto
          </label>
          <textarea
            id="lettering-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className={INPUT}
          />
        </div>

        <div className="space-y-1.5">
          <label className={LABEL} htmlFor="lettering-font">
            Fonte
          </label>
          <select
            id="lettering-font"
            value={family}
            onChange={(e) => setFamily(e.target.value)}
            className={INPUT}
          >
            {fonts.map((font) => (
              <option key={font.family} value={font.family}>
                {font.label}
              </option>
            ))}
          </select>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900">
            <Upload aria-hidden="true" className="size-4" />
            Carregar fonte do cliente
            <input
              type="file"
              accept=".ttf,.otf,.woff,.woff2"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void loadFont(file);
                e.target.value = "";
              }}
            />
          </label>
          {fontError ? (
            <p role="alert" className="text-sm text-red-600">
              {fontError}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="lettering-size">
              Tamanho
            </label>
            <input
              id="lettering-size"
              type="number"
              min={8}
              max={600}
              value={size}
              onChange={(e) => setSize(Number(e.target.value) || 8)}
              className={INPUT}
            />
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="lettering-color">
              Cor
            </label>
            <input
              id="lettering-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-full rounded-md border border-neutral-200 bg-white p-1"
            />
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="lettering-line-height">
              Entrelinha
            </label>
            <input
              id="lettering-line-height"
              type="number"
              step={0.05}
              min={0.5}
              max={3}
              value={lineHeight}
              onChange={(e) => setLineHeight(Number(e.target.value) || 1)}
              className={INPUT}
            />
          </div>
          <div className="space-y-1.5">
            <label className={LABEL} htmlFor="lettering-tracking">
              Espaçamento
            </label>
            <input
              id="lettering-tracking"
              type="number"
              step={0.5}
              value={tracking}
              onChange={(e) => setTracking(Number(e.target.value) || 0)}
              className={INPUT}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={LABEL} htmlFor="lettering-align">
            Alinhamento
          </label>
          <select
            id="lettering-align"
            value={align}
            onChange={(e) => setAlign(e.target.value as typeof align)}
            className={INPUT}
          >
            <option value="left">Esquerda</option>
            <option value="center">Centro</option>
            <option value="right">Direita</option>
          </select>
        </div>

        <Button
          render={<a href={png ?? "#"} download="lettering.png" />}
          size="lg"
          className="w-full"
        >
          <Download aria-hidden="true" data-icon="inline-start" />
          Baixar PNG
        </Button>
        <p className="text-sm text-neutral-500">
          No celular: segure o dedo na imagem ao lado e escolha “Adicionar às
          Fotos”. Depois é só usar o sticker de foto no story.
        </p>
      </div>

      <div
        className="flex min-h-64 items-center justify-center rounded-lg border border-neutral-200 p-6"
        style={{ background: CHECKERBOARD }}
      >
        {png ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL gerada no cliente; o next/image não serve.
          <img
            src={png}
            alt={`Prévia do lettering: ${text}`}
            className="max-h-[60vh] max-w-full object-contain"
          />
        ) : (
          <p className="flex items-center gap-2 text-sm text-neutral-500">
            <Type aria-hidden="true" className="size-4" />
            Escreva algo pra ver a prévia.
          </p>
        )}
      </div>
    </div>
  );
}
