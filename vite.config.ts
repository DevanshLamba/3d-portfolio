import { createServer, defineConfig, loadEnv, type Connect, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

type ContactModule = typeof import("./api/contact");
type ChatModule = typeof import("./server/chat");
type Handler = (request: Request, env: Record<string, string | undefined>, deps: { fetch: typeof fetch; now: () => number; log: (m: string) => void }) => Promise<Response>;

// Same paths as on Vercel: api/contact.ts, and api/chat.js (bundled from server/chat.ts).
const ROUTES: Record<string, { module: string; load: (m: unknown) => Handler }> = {
  "/api/contact": { module: "/api/contact.ts", load: (m) => (m as ContactModule).handleContact as Handler },
  "/api/chat": { module: "/server/chat.ts", load: (m) => (m as ChatModule).handleChat as Handler },
};

// The parts of Node's IncomingMessage used here (Node's types aren't installed).
type NodeRequest = AsyncIterable<Uint8Array> & {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  originalUrl?: string;
};

/**
 * Serves the API routes for `npm run dev` and `npm run preview`, the way
 * Vercel does in production. Settings come from .env.local on this machine
 * and are never exposed to the browser bundle.
 */
function apiRoutes(): Plugin {
  let env: Record<string, string | undefined> = {};

  const attach = (middlewares: Connect.Server, load: (module: string) => Promise<unknown>) => {
    middlewares.use(async (incoming, res, next) => {
      const req = incoming as unknown as NodeRequest;
      // Exact paths only: "/api/contact.ts" is the module the browser loads
      // for the form's validation rules.
      const route = ROUTES[(req.originalUrl ?? "").split("?")[0]];
      if (!route) return next();
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
      const request = new Request(`http://localhost${req.originalUrl}`, {
        method: req.method,
        headers,
        body: req.method === "GET" || req.method === "HEAD" ? undefined : new TextDecoder().decode(body),
      });
      const handler = route.load(await load(route.module));
      const response = await handler(request, env, { fetch, now: Date.now, log: (m) => console.log(`[api] ${m}`) });
      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.end(await response.text());
    });
  };

  return {
    name: "api-routes",
    configResolved(config) {
      const loaded = loadEnv(config.mode, config.root, "");
      // Only the form's own settings; locally a missing key means a dry run.
      env = {
        RESEND_API_KEY: loaded.RESEND_API_KEY,
        CONTACT_TO_EMAIL: loaded.CONTACT_TO_EMAIL,
        CONTACT_FROM_EMAIL: loaded.CONTACT_FROM_EMAIL,
        ALLOWED_ORIGINS: loaded.ALLOWED_ORIGINS,
        GEMINI_API_KEY: loaded.GEMINI_API_KEY,
        GEMINI_MODEL: loaded.GEMINI_MODEL,
      };
    },
    configureServer(server) {
      attach(server.middlewares, (module) => server.ssrLoadModule(module));
    },
    configurePreviewServer(server) {
      // Preview serves built files only, so compile the handler with a small
      // Vite instance on first use.
      let vite: ReturnType<typeof createServer> | null = null;
      attach(server.middlewares, async (module) => {
        vite ??= createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "silent" });
        return (await vite).ssrLoadModule(module);
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), apiRoutes()],
});
