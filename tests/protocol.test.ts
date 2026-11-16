import { describe, expect, it } from "vitest";
import { formatProtocol, parseProtocol } from "@/lib/protocol";

describe("protocolo", () => {
  it("formata preservando zeros", () => {
    expect(formatProtocol("00420017")).toBe("0042 0017");
    expect(formatProtocol("00000001")).toBe("0000 0001");
    expect(formatProtocol(null)).toBe("");
  });
  it("lê as formas digitadas", () => {
    expect(parseProtocol("00420017")).toBe("00420017");
    expect(parseProtocol("0042 0017")).toBe("00420017");
    expect(parseProtocol("OS 0042-0017")).toBe("00420017");
    expect(parseProtocol("os00420017")).toBe("00420017");
  });
  it("rejeita o que não é protocolo", () => {
    expect(parseProtocol("420017")).toBeNull();
    expect(parseProtocol("004200171")).toBeNull();
    expect(parseProtocol("abcd1234")).toBeNull();
  });
});
