import "dotenv/config";
import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initDb } from "./db.js";
import { authRouter } from "./routes/auth.js";
import { contactsRouter } from "./routes/contacts.js";
import { meRouter, statsRouter } from "./routes/me.js";
import { requestsRouter } from "./routes/requests.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3001);
const dbPath =
  process.env.DATABASE_PATH || path.join(__dirname, "../data/givememoney.db");

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "dev-givememoney-secret-change-me";
  console.warn("JWT_SECRET not set — using insecure development default");
}

initDb(dbPath);

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "givememoney" });
});

// Primary REST API
app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/stats", statsRouter);
app.use("/api/contacts", contactsRouter);
app.use("/api/requests", requestsRouter);

// PDF plan aliases (same handlers, flatter paths)
app.use("/api/register", (req, res, next) => {
  req.url = "/register" + (req.url === "/" ? "" : req.url);
  authRouter(req, res, next);
});
app.use("/api/login", (req, res, next) => {
  req.url = "/login" + (req.url === "/" ? "" : req.url);
  authRouter(req, res, next);
});
app.use("/api/send-requests", (req, res, next) => {
  if (req.method === "POST") {
    req.url = "/send-all";
  }
  requestsRouter(req, res, next);
});
app.use("/api/settings", (req, res, next) => {
  if (req.method === "POST" || req.method === "PUT") {
    Object.defineProperty(req, "method", { value: "PUT", writable: true });
    req.url = "/settings";
  }
  meRouter(req, res, next);
});

const clientDist = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) res.status(404).json({ error: "Not found" });
  });
});

app.listen(PORT, () => {
  console.log(`GiveMeMoney server running on http://localhost:${PORT}`);
});
