import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: () => ({}) }));

import { buildContainerParams } from "@/lib/instagram";
import { brasiliaToISO, isoToBrasilia } from "@/lib/backlogTypes";

describe("buildContainerParams", () => {
  it("foto usa image_url", () => {
    const { main } = buildContainerParams({ format: "foto", urls: ["https://x/a.jpg"], caption: "oi" });
    expect(main).toEqual({ image_url: "https://x/a.jpg", caption: "oi" });
  });
  it("reel usa REELS + video_url", () => {
    const { main } = buildContainerParams({ format: "reel", urls: ["https://x/a.mp4"], caption: "" });
    expect(main.media_type).toBe("REELS");
    expect(main.video_url).toBe("https://x/a.mp4");
  });
  it("carrossel cria filhos, vídeo vira VIDEO", () => {
    const plan = buildContainerParams({
      format: "carrossel",
      urls: ["https://x/a.jpg", "https://x/b.mp4"],
      caption: "c",
    });
    expect(plan.children).toHaveLength(2);
    expect(plan.children![1]).toMatchObject({ media_type: "VIDEO", video_url: "https://x/b.mp4" });
    expect(plan.main.media_type).toBe("CAROUSEL");
  });
  it("card com várias artes vira carrossel; com uma, foto", () => {
    const many = buildContainerParams({ format: "card", urls: ["https://x/a.jpg", "https://x/b.jpg"], caption: "c" });
    expect(many.main.media_type).toBe("CAROUSEL");
    const one = buildContainerParams({ format: "card", urls: ["https://x/a.jpg"], caption: "c" });
    expect(one.main).toEqual({ image_url: "https://x/a.jpg", caption: "c" });
  });
  it("carrossel com 1 mídia ou sem mídia falha", () => {
    expect(() => buildContainerParams({ format: "carrossel", urls: ["a"], caption: "" })).toThrow();
    expect(() => buildContainerParams({ format: "foto", urls: [], caption: "" })).toThrow();
  });
});

describe("horário de Brasília", () => {
  it("datetime-local vira ISO em UTC e volta igual", () => {
    expect(brasiliaToISO("2026-10-22T10:00")).toBe("2026-10-22T13:00:00.000Z");
    expect(isoToBrasilia("2026-10-22T13:00:00.000Z")).toBe("2026-10-22T10:00");
    expect(isoToBrasilia("2026-10-22T01:30:00.000Z")).toBe("2026-10-21T22:30");
  });
  it("valor vazio ou inválido vira null", () => {
    expect(brasiliaToISO("")).toBeNull();
    expect(brasiliaToISO("lixo")).toBeNull();
  });
});
