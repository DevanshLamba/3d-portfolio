import { createServer, defineConfig, loadEnv, type Connect, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

type ContactModule = typeof import("./api/contact");

// The parts of Node's IncomingMessage used here (Node's types aren't installed).
type NodeRequest = AsyncIterable<Uint8Array> & {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  originalUrl?: string;
};

/**
 * Serves api/contact.ts at /api/contact for `npm run dev` and `npm run
 * preview`, the way Vercel does in production. Settings come from .env.local
 * on this machine and are never exposed to the browser bundle.
 */
function contactApi(): Plugin {
  let env: Record<string, string | undefined> = {};

  const attach = (middlewares: Connect.Server, load: () => Promise<ContactModule>) => {
    middlewares.use("/api/contact", async (incoming, res) => {
      const req = incoming as unknown as NodeRequest;
      const chunks: Uint8Array[] = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
      let offset = 0;
      for (const c of chunks) {
        body.set(c, offset);
        offset += c.length;
      }
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) if (typeof value === "string") headers.set(key, value);
      const request = new Request(`http://localhost${req.originalUrl ?? "/api/contact"}`, {
        method: req.method,
        headers,
        body: req.method === "GET" || req.method === "HEAD" ? undefined : new TextDecoder().decode(body),
      });
      const { handleContact } = await load();
      const response = await handleContact(request, env, { fetch, now: Date.now, log: (m) => console.log(`[contact] ${m}`) });
      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.end(await response.text());
    });
  };

  return {
    name: "contact-api",
    configResolved(config) {
      const loaded = loadEnv(config.mode, config.root, "");
      // Only the form's own settings; locally a missing key means a dry run.
      env = {
        RESEND_API_KEY: loaded.RESEND_API_KEY,
        CONTACT_TO_EMAIL: loaded.CONTACT_TO_EMAIL,
        CONTACT_FROM_EMAIL: loaded.CONTACT_FROM_EMAIL,
        ALLOWED_ORIGINS: loaded.ALLOWED_ORIGINS,
      };
    },
    configureServer(server) {
      attach(server.middlewares, () => server.ssrLoadModule("/api/contact.ts") as Promise<ContactModule>);
    },
    configurePreviewServer(server) {
      // Preview serves built files only, so compile the handler with a small
      // Vite instance on first use.
      let loader: Promise<ContactModule> | null = null;
      attach(server.middlewares, () => {
        loader ??= createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "silent" }).then(
          (vite) => vite.ssrLoadModule("/api/contact.ts") as Promise<ContactModule>
        );
        return loader;
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), contactApi()],
});
