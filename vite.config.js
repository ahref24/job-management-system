import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { handleSheetsRequest } from "./server/sheets.js";

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

/**
 * Serve /api/sheets during `vite` and `vite preview` so local development uses
 * exactly the same proxy as the Vercel function.
 */
function sheetsApiPlugin(env) {
  const middleware = async (req, res) => {
    try {
      let body;
      if (req.method === "POST") {
        const raw = await readBody(req);
        body = raw ? JSON.parse(raw) : {};
      }

      const result = await handleSheetsRequest({ method: req.method, body }, env);
      res.statusCode = result.status;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      res.end(JSON.stringify(result.body));
    } catch (error) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          ok: false,
          error: error && error.message ? error.message : "Bad request.",
        })
      );
    }
  };

  return {
    name: "jobboard-sheets-api",
    configureServer(server) {
      server.middlewares.use("/api/sheets", middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/sheets", middleware);
    },
  };
}

export default defineConfig(({ mode }) => {
  // Empty prefix loads every .env value, not just VITE_* ones.
  const env = loadEnv(mode, process.cwd(), "");
  const sheetsEnabled = Boolean(String(env.SHEETS_URL || "").trim());

  return {
    plugins: [react(), sheetsApiPlugin(env)],
    define: {
      __SHEETS_ENABLED__: JSON.stringify(sheetsEnabled),
    },
    // Relative asset paths so the build also works when hosted under a subpath.
    base: "./",
    server: {
      port: 5173,
      open: true,
    },
    test: {
      environment: "node",
      include: ["src/**/*.test.{js,jsx}", "server/**/*.test.js"],
    },
  };
});
