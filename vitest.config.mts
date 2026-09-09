import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    // Mesmo apelido do tsconfig, pra o teste importar como o app importa.
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // O pacote real lança fora do runtime do React Server.
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url)
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
