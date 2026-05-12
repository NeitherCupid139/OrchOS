import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { paraglideVitePlugin } from "@inlang/paraglide-js";

const config = defineConfig(({ isSsrBuild }) => ({
  resolve: {
    tsconfigPaths: true,
    alias: isSsrBuild
      ? [
          {
            find: "shiki",
            replacement: "/root/project/OrchOS/apps/web/src/server/ssr-stubs/shiki.ts",
          },
          {
            find: "recharts",
            replacement: "/root/project/OrchOS/apps/web/src/server/ssr-stubs/recharts.tsx",
          },
          {
            find: "@remotion/player",
            replacement: "/root/project/OrchOS/apps/web/src/server/ssr-stubs/remotion-player.tsx",
          },
        ]
      : undefined,
  },
  server: {
    host: "0.0.0.0",
    proxy: {
      "/ws": {
        target: "http://127.0.0.1:5173",
        ws: true,
      },
    },
  },
  plugins: [
    cloudflare({
      viteEnvironment: { name: "ssr" },
    }),
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/paraglide",
    }),
    devtools(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
}));

export default config;
