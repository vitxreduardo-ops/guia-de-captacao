import { describe, expect, it } from "vitest";
import { firstUrl, urlKey } from "@/lib/agent/url";

describe("urlKey", () => {
  it("trata como igual o que muda só no rastreio", () => {
    const a = urlKey("https://www.instagram.com/p/ABC123/?igsh=xyz&utm_source=ig");
    expect(a).toBe("instagram.com/p/ABC123");
    expect(urlKey("instagram.com/p/ABC123")).toBe(a);
    expect(urlKey("HTTPS://Instagram.com/p/ABC123/#comentarios")).toBe(a);
  });

  it("mantém parâmetros que mudam o destino", () => {
    expect(urlKey("https://youtube.com/watch?v=aaa&si=x")).toBe("youtube.com/watch?v=aaa");
    expect(urlKey("https://youtube.com/watch?v=bbb")).not.toBe(urlKey("https://youtube.com/watch?v=aaa"));
  });

  it("rejeita o que não é http", () => {
    expect(urlKey("javascript:alert(1)")).toBeNull();
    expect(urlKey("ftp://x.com/a")).toBeNull();
    expect(urlKey("")).toBeNull();
  });
});

describe("firstUrl", () => {
  it("acha o link no meio do texto, sem pontuação no fim", () => {
    expect(firstUrl("Salva essa: https://pin.it/abc, pra Foco.")).toBe("https://pin.it/abc");
    expect(firstUrl("sem link aqui")).toBeNull();
  });
});
