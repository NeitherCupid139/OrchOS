import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { paraglideVitePlugin } from "@inlang/paraglide-js";

const __dirname = import.meta.dirname;

const plugins = [
  paraglideVitePlugin({
    project: "./project.inlang",
    outdir: "./src/paraglide",
  }),
  devtools(),
  tailwindcss(),
  tanstackStart(),
  viteReact(),
];

const isWithoutCloudflare = process.env.WITHOUT_CLOUDFLARE === "true";

if (!isWithoutCloudflare) {
  plugins.splice(4, 0, cloudflare({ viteEnvironment: { name: "ssr" } }));
}

const config = defineConfig(({ isSsrBuild }) => ({
  resolve: {
    tsconfigPaths: true,
    alias: isSsrBuild && !isWithoutCloudflare
      ? [
          {
            find: /^shiki$/,
            replacement: `${__dirname}/src/server/ssr-stubs/shiki.ts`,
          },
          {
            find: /^recharts$/,
            replacement: `${__dirname}/src/server/ssr-stubs/recharts.tsx`,
          },
          {
            find: /^@remotion\/player$/,
            replacement: `${__dirname}/src/server/ssr-stubs/remotion-player.tsx`,
          },
        ]
      : isWithoutCloudflare
        ? [
            {
              find: /^cloudflare:workers$/,
              replacement: `${__dirname}/src/server/ssr-stubs/cloudflare-workers.ts`,
            },
            {
              find: /^shiki$/,
              replacement: `${__dirname}/src/server/ssr-stubs/shiki.ts`,
            },
            {
              find: /^recharts$/,
              replacement: `${__dirname}/src/server/ssr-stubs/recharts.tsx`,
            },
            {
              find: /^@remotion\/player$/,
              replacement: `${__dirname}/src/server/ssr-stubs/remotion-player.tsx`,
            },
          ]
        : undefined,
  },
  server: {
    allowedHosts: true,
    host: "0.0.0.0",
    proxy: {},
  },
  plugins,
}));

export default config;
