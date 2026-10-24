import { describe, expect, it } from "vitest";
import { extractDriveFileId, igExtensionFor } from "@/lib/instagramMidia";

describe("igExtensionFor", () => {
  it("aceita JPEG, MP4 e MOV", () => {
    expect(igExtensionFor("image/jpeg")).toBe("jpg");
    expect(igExtensionFor("video/mp4; charset=x")).toBe("mp4");
    expect(igExtensionFor("video/quicktime")).toBe("mov");
  });
  it("recusa PNG, WebP e o resto", () => {
    expect(igExtensionFor("image/png")).toBeNull();
    expect(igExtensionFor("application/pdf")).toBeNull();
  });
});

describe("extractDriveFileId", () => {
  it("lê os formatos de link do Drive", () => {
    expect(extractDriveFileId("https://drive.google.com/file/d/ABC_123-x/view?usp=sharing")).toBe("ABC_123-x");
    expect(extractDriveFileId("https://drive.google.com/open?id=ABC123")).toBe("ABC123");
    expect(extractDriveFileId("https://drive.google.com/uc?export=download&id=ABC123")).toBe("ABC123");
  });
  it("devolve null pra outra coisa", () => {
    expect(extractDriveFileId("https://exemplo.com/a.jpg")).toBeNull();
  });
});
