import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/references", () => ({ embedUrlFor: () => null }));
import { blocksFraming, isPrivateHost, parseMeta } from "@/lib/linkMeta";

describe("isPrivateHost", () => {
  it.each(["localhost", "127.0.0.1", "10.0.0.5", "192.168.1.2", "172.20.1.1", "169.254.169.254", "intranet", "foo.local", "::1"])(
    "barra %s", (h) => expect(isPrivateHost(h)).toBe(true)
  );
  it.each(["example.com", "claude.ai", "172.32.0.1"])("deixa %s", (h) => expect(isPrivateHost(h)).toBe(false));
});

describe("blocksFraming", () => {
  const h = (o: Record<string, string>) => new Headers(o);
  it("X-Frame-Options DENY/SAMEORIGIN bloqueia", () => {
    expect(blocksFraming(h({ "x-frame-options": "DENY" }))).toBe(true);
    expect(blocksFraming(h({ "x-frame-options": "SAMEORIGIN" }))).toBe(true);
  });
  it("frame-ancestors restrito bloqueia", () => {
    expect(blocksFraming(h({ "content-security-policy": "default-src 'self'; frame-ancestors 'self'" }))).toBe(true);
    expect(blocksFraming(h({ "content-security-policy": "frame-ancestors 'none'" }))).toBe(true);
  });
  it("sem restrição libera", () => {
    expect(blocksFraming(h({}))).toBe(false);
    expect(blocksFraming(h({ "content-security-policy": "frame-ancestors *" }))).toBe(false);
  });
});

describe("parseMeta", () => {
  it("lê og:*, resolve imagem relativa e decodifica entidades", () => {
    const html = `<head><title>Fallback</title><meta property="og:title" content="A &amp; B"><meta content="desc" name="description"><meta property="og:image" content="/i.png"></head>`;
    expect(parseMeta(html, "https://x.com/a")).toEqual({ title: "A & B", description: "desc", image: "https://x.com/i.png" });
  });
  it("cai no <title> sem og:title", () => {
    expect(parseMeta("<title> Oi </title>", "https://x.com").title).toBe("Oi");
  });
});
