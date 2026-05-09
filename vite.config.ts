import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

function textractProxyPlugin(): Plugin {
  let child: ChildProcess | null = null;

  function resolveEnvFile(): string | null {
    for (const name of [".env.local", ".env"]) {
      const full = path.resolve(__dirname, name);
      if (!existsSync(full)) continue;
      try {
        const src = readFileSync(full, "utf-8");
        if (/^VITE_TEXTRACT_ENDPOINT\s*=\s*\S+/m.test(src)) return full;
      } catch { /* skip */ }
    }
    return null;
  }

  return {
    name: "vite-plugin-textract-proxy",
    apply: "serve",
    configureServer(server) {
      const envFile = resolveEnvFile();
      if (!envFile) {
        console.log("[textract-proxy] VITE_TEXTRACT_ENDPOINT not found — proxy not started.");
        return;
      }

      const proxyScript = path.resolve(__dirname, "server/textract-proxy.mjs");
      child = spawn("node", [`--env-file=${envFile}`, proxyScript], {
        stdio: "inherit",
        shell: false,
      });

      child.on("error", (err) => {
        console.error("[textract-proxy] Failed to start:", err.message);
      });

      // Kill child when the Vite dev server shuts down.
      server.httpServer?.once("close", () => {
        child?.kill();
        child = null;
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger(), mode === "development" && textractProxyPlugin()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
