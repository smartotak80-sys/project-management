// server.js (ESM) — Express API для Railway (members, news, gallery, users, auth)
import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import jwt from "jsonwebtoken";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const DB_PATH = path.resolve(process.cwd(), "db.json");

// Admin credentials
const ADMIN_LOGIN = process.env.ADMIN_LOGIN || "famillybarracuda@gmail.com";
const ADMIN_PASS = process.env.ADMIN_PASS || "barracuda123";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "change-this";

// --- DB helpers ---
function ensureDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = { users: [], members: [], news: [], gallery: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), "utf8");
  }
}
function readDB() {
  ensureDB();
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}
function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

// --- JWT Admin Auth ---
function createToken(data) {
  return jwt.sign(data, ADMIN_SECRET, { expiresIn: "8h" });
}
function verifyToken(token) {
  try { return jwt.verify(token, ADMIN_SECRET); }
  catch { return null; }
}
function requireAdmin(req, res, next) {
  let token = req.headers.authorization || "";
  if (token.startsWith("Bearer ")) token = token.slice(7);
  const data = verifyToken(token);
  if (!data || data.role !== "admin") return res.status(403).json({ ok: false, error: "Forbidden" });
  next();
}

// Default route
app.get("/", (req, res) => res.send("Barracuda Railway API"));

// Admin login → token
app.post("/auth/login", (req, res) => {
  const { user, pass } = req.body;
  if (user === ADMIN_LOGIN && pass === ADMIN_PASS) {
    const token = createToken({ role: "admin" });
    return res.json({ ok: true, token });
  }
  res.status(401).json({ ok: false, error: "Invalid admin" });
});

// Public data
app.get("/api/members", (req, res) => res.json({ ok: true, members: readDB().members }));
app.get("/api/news", (req, res) => res.json({ ok: true, news: readDB().news }));
app.get("/api/gallery", (req, res) => res.json({ ok: true, gallery: readDB().gallery }));
app.get("/api/users", (req, res) => {
  const safe = readDB().users.map(u => ({ username: u.username, email: u.email, role: u.role, regDate: u.regDate }));
  res.json({ ok: true, users: safe });
});

// Admin actions
app.post("/api/members", requireAdmin, (req, res) => {
  const db = readDB();
  const m = { id: Date.now(), ...req.body };
  db.members.push(m);
  writeDB(db);
  res.json({ ok: true, m });
});
app.delete("/api/members/:id", requireAdmin, (req, res) => {
  const db = readDB();
  db.members = db.members.filter(m => m.id != req.params.id);
  writeDB(db);
  res.json({ ok: true });
});

app.post("/api/news", requireAdmin, (req, res) => {
  const db = readDB();
  const item = { id: Date.now(), ...req.body };
  db.news.push(item);
  writeDB(db);
  res.json({ ok: true });
});
app.delete("/api/news/:id", requireAdmin, (req, res) => {
  const db = readDB();
  db.news = db.news.filter(n => n.id != req.params.id);
  writeDB(db);
  res.json({ ok: true });
});

app.post("/api/gallery", requireAdmin, (req, res) => {
  const db = readDB();
  const item = { id: Date.now(), ...req.body };
  db.gallery.push(item);
  writeDB(db);
  res.json({ ok: true });
});
app.delete("/api/gallery/:id", requireAdmin, (req, res) => {
  const db = readDB();
  db.gallery = db.gallery.filter(n => n.id != req.params.id);
  writeDB(db);
  res.json({ ok: true });
});

// User register/login
app.post("/api/register", (req, res) => {
  const db = readDB();
  const { username, email, password } = req.body;
  if (!username || !password) return res.json({ ok: false, error: "Missing" });
  if (db.users.find(u => u.username === username)) return res.json({ ok: false, error: "Exists" });

  db.users.push({ username, email, password, role: "member", regDate: new Date().toISOString() });
  writeDB(db);
  res.json({ ok: true });
});

app.post("/api/login", (req, res) => {
  const db = readDB();
  const { username, password } = req.body;
  const user = db.users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ ok: false });
  res.json({ ok: true, user: { username: user.username, role: user.role } });
});

app.listen(PORT, () => console.log(`API running on port ${PORT}`));
