// server.js (ESM) — Express API для Railway (members, news, gallery, users, auth)
import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import jwt from "jsonwebtoken";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const DB_PATH = path.resolve(process.cwd(), "db.json");

// Admin credentials via env (set in Railway Envs)
const ADMIN_LOGIN = process.env.ADMIN_LOGIN || "famillybarracuda@gmail.com";
const ADMIN_PASS = process.env.ADMIN_PASS || "barracuda123";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "please-change-this-secret";

// --- DB helpers (file-backed) ---
function ensureDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = { users: [], members: [], news: [], gallery: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), "utf8");
  }
}
function readDB() {
  ensureDB();
  const raw = fs.readFileSync(DB_PATH, "utf8");
  return JSON.parse(raw);
}
function writeDB(obj) {
  fs.writeFileSync(DB_PATH, JSON.stringify(obj, null, 2), "utf8");
}

// --- Auth helpers ---
function createToken(payload) {
  return jwt.sign(payload, ADMIN_SECRET, { expiresIn: "8h" });
}
function verifyToken(token) {
  try { return jwt.verify(token, ADMIN_SECRET); } catch(e) { return null; }
}
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || req.headers["x-admin-token"];
  if (!auth) return res.status(401).json({ ok: false, error: "No token" });
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return res.status(403).json({ ok: false, error: "Forbidden" });
  req.admin = payload;
  next();
}

// --- Routes ---

app.get("/", (req, res) => res.send("Barracuda Railway API"));

/* --- AUTH for admin: POST /auth/login {user, pass} => {token} --- */
app.post("/auth/login", (req, res) => {
  const { user, pass } = req.body || {};
  if (user === ADMIN_LOGIN && pass === ADMIN_PASS) {
    const token = createToken({ role: "admin", user: "ADMIN" });
    return res.json({ ok: true, token });
  }
  return res.status(401).json({ ok: false, error: "Invalid credentials" });
});

/* --- PUBLIC READ routes --- */
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
app.get("/api/users", (req, res) => {
  const db = readDB();
  // don't leak passwords
  const safe = db.users.map(u => ({ username: u.username, email: u.email, role: u.role, regDate: u.regDate }));
  res.json({ ok: true, users: safe });
});

/* --- ADMIN WRITE routes (requireAdmin) --- */
// MEMBERS
app.post("/api/members", requireAdmin, (req, res) => {
  const db = readDB();
  const { name, role, owner, links } = req.body || {};
  if (!name || !role) return res.status(400).json({ ok: false, error: "Missing fields" });
  const id = Date.now();
  const member = { id, name, role, owner: owner || "ADMIN", links: links || {} };
  db.members.push(member);
  writeDB(db);
  res.json({ ok: true, member });
});
app.delete("/api/members/:id", requireAdmin, (req, res) => {
  const db = readDB();
  db.members = db.members.filter(m => m.id != req.params.id);
  writeDB(db);
  res.json({ ok: true });
});

// NEWS
app.post("/api/news", requireAdmin, (req, res) => {
  const db = readDB();
  const { title, date, summary } = req.body || {};
  if(!title||!date||!summary) return res.status(400).json({ ok:false, error:"Missing" });
  const item = { id: Date.now(), title, date, summary };
  db.news.push(item);
  writeDB(db);
  res.json({ ok: true, item });
});
app.delete("/api/news/:id", requireAdmin, (req, res) => {
  const db = readDB();
  db.news = db.news.filter(n => n.id != req.params.id);
  writeDB(db);
  res.json({ ok: true });
});

// GALLERY
app.post("/api/gallery", requireAdmin, (req, res) => {
  const db = readDB();
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ ok:false, error:"Missing url" });
  const item = { id: Date.now(), url };
  db.gallery.push(item);
  writeDB(db);
  res.json({ ok: true, item });
});
app.delete("/api/gallery/:id", requireAdmin, (req, res) => {
  const db = readDB();
  db.gallery = db.gallery.filter(g => g.id != req.params.id);
  writeDB(db);
  res.json({ ok: true });
});

/* --- Optional: create user (register) stored in DB.users (no password hash for quick start) --- */
app.post("/api/register", (req, res) => {
  const db = readDB();
  const { username, email, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ ok:false, error:"Missing" });
  if (db.users.find(u => u.username === username)) return res.status(400).json({ ok:false, error:"Username exists" });
  const user = { username, email, password, role: "member", regDate: new Date().toISOString() };
  db.users.push(user);
  writeDB(db);
  res.json({ ok: true });
});

/* --- Simple login for users (local) - returns user object (no JWT) --- */
app.post("/api/login", (req, res) => {
  const db = readDB();
  const { username, password } = req.body || {};
  const found = db.users.find(u => u.username === username && u.password === password);
  if (!found) return res.status(401).json({ ok:false, error:"Invalid" });
  // In production use JWT; for now return user (client stores in localStorage)
  res.json({ ok:true, user: { username: found.username, role: found.role } });
});

app.listen(PORT, () => {
  console.log(`Barracuda Railway API running on port ${PORT}`);
});
