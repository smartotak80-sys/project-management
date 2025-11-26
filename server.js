import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// ===== ПУБЛІЧНІ СТАТИЧНІ ФАЙЛИ =====
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===== DATABASE FILE =====
const DB_PATH = path.join(__dirname, "db.json");

function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], members: [], news: [], gallery: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ====== API ======
app.get("/api/members", (req, res) => {
  const db = readDB();
  res.json({ ok: true, members: db.members });
});

app.get("/api/news", (req, res) => {
  const db = readDB();
  res.json({ ok: true, news: db.news });
});

app.get("/api/gallery", (req, res) => {
  const db = readDB();
  res.json({ ok: true, gallery: db.gallery });
});

// ====== ADMIN (PLACEHOLDER) ======
app.post("/api/admin/news", (req, res) => {
  const db = readDB();
  const item = { id: Date.now(), ...req.body };
  db.news.push(item);
  writeDB(db);
  res.json({ ok: true, item });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("API running on port", PORT);
});
