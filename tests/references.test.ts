import { describe, expect, it } from "vitest";
import {
  isLikelyImageUrl,
  isLikelyVideoUrl,
  toPdfSafeImageUrl,
  youtubeVideoId,
} from "@/lib/references";

describe("isLikelyImageUrl", () => {
  it("aceita extensão no caminho", () => {
    expect(isLikelyImageUrl("https://exemplo.com/foto.JPG")).toBe(true);
  });

  it("aceita formato na query (CDN do Cosmos)", () => {
    expect(
      isLikelyImageUrl(
        "https://cdn.cosmos.so/0753f93d-12ee-4414-928e-9518826ef53c?format=webp&w=2048"
      )
    ).toBe(true);
  });

  it("aceita thumbnail do Drive", () => {
    expect(
      isLikelyImageUrl("https://drive.google.com/thumbnail?id=abc123&sz=w2000")
    ).toBe(true);
  });

  it("aceita URL pública do storage do Supabase", () => {
    expect(
      isLikelyImageUrl(
        "https://xyz.supabase.co/storage/v1/object/public/references/abc"
      )
    ).toBe(true);
  });

  it("recusa link de post do Instagram", () => {
    expect(isLikelyImageUrl("https://www.instagram.com/p/ABC123/")).toBe(false);
  });

  it("recusa página do Drive que não é thumbnail", () => {
    expect(
      isLikelyImageUrl("https://drive.google.com/file/d/abc123/view")
    ).toBe(false);
  });

  it("recusa URL inválida", () => {
    expect(isLikelyImageUrl("nao-e-url")).toBe(false);
  });
});

describe("toPdfSafeImageUrl", () => {
  it("troca webp por jpeg (o @react-pdf não decodifica webp)", () => {
    expect(
      toPdfSafeImageUrl("https://cdn.cosmos.so/abc?format=webp&w=2048")
    ).toBe("https://cdn.cosmos.so/abc?format=jpeg&w=2048");
  });

  it("troca avif por jpeg", () => {
    expect(toPdfSafeImageUrl("https://cdn.cosmos.so/abc?format=avif")).toBe(
      "https://cdn.cosmos.so/abc?format=jpeg"
    );
  });

  it("não mexe em URL já compatível", () => {
    const url = "https://exemplo.com/foto.jpg";
    expect(toPdfSafeImageUrl(url)).toBe(url);
  });

  it("devolve a entrada quando não é URL válida", () => {
    expect(toPdfSafeImageUrl("nao-e-url")).toBe("nao-e-url");
  });
});

describe("youtubeVideoId", () => {
  it("acha o id nas formas de link do YouTube", () => {
    expect(youtubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10")).toBe(
      "dQw4w9WgXcQ"
    );
    expect(youtubeVideoId("https://www.youtube.com/shorts/abc123XYZ")).toBe(
      "abc123XYZ"
    );
  });

  it("ignora link de outro site, mesmo com ?v=", () => {
    expect(youtubeVideoId("https://exemplo.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });
});

describe("isLikelyVideoUrl", () => {
  it("aceita arquivo de vídeo servido direto", () => {
    expect(isLikelyVideoUrl("https://exemplo.com/clipe.MP4")).toBe(true);
  });

  it("recusa página que só fala de vídeo", () => {
    expect(isLikelyVideoUrl("https://vimeo.com/123456")).toBe(false);
  });
});
