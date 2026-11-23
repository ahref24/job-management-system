import { handleSheetsRequest } from "../server/sheets.js";

/**
 * Vercel serverless function. The React app calls /api/sheets on the same
 * origin, so the browser never hits Google's CORS restrictions and the token
 * stays in server-side environment variables.
 */
export default async function handler(req, res) {
  const result = await handleSheetsRequest({ method: req.method, body: req.body }, process.env);

  res.statusCode = result.status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(result.body));
}
