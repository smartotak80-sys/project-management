import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// === STATIC FRONTEND ===
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "db.json");

// Admin ENV
const ADMIN_LOGIN = process.env.ADMIN_LOGIN || "admin@mail.com";
const ADMIN_PASS = process.env.ADMIN_PASS || "123456";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "secret123";

// DB helpers
function ensureDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ 
      users: [], members: [], news: [], gallery: [] 
    }, null, 2));
  }
}
function readDB() {
  ensureDB();
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}
function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// JWT helpers
function createToken(payload) {
  return jwt.sign(payload, ADMIN_SECRET, { expiresIn: "12h" });
}
function verifyToken(token) {
  try { return jwt.verify(token, ADMIN_SECRET); }
  catch { return null; }
}
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ ok: false, error: "No token" });

  const token = auth.replace("Bearer ", "");
  const data = verifyToken(token);

  if (!data || data.role !== "admin")
    return res.status(403).json({ ok: false, error: "Forbidden" });

  next();
}

// === AUTH ===
app.post("/auth/login", (req, res) => {
  const { user, pass } = req.body;

  if (user === ADMIN_LOGIN && pass === ADMIN_PASS) {
    return res.json({
      ok: true,
      token: createToken({ role: "admin" })
    });
  }

  return res.status(401).json({ ok: false, error: "Invalid admin login" });
});

// === PUBLIC DATA ===
app.get("/api/members", (req, res) => res.json({ ok: true, members: readDB().members }));
app.get("/api/news", (req, res) => res.json({ ok: true, news: readDB().news }));
app.get("/api/gallery", (req, res) => res.json({ ok: true, gallery: readDB().gallery }));
app.get("/api/users", (req, res) => {
  const safe = readDB().users.map(u => ({
    username: u.username,
    email: u.email,
    role: u.role,
    regDate: u.regDate
  }));
  res.json({ ok: true, users: safe });
});

// === ADMIN ACTIONS ===
app.post("/api/members", requireAdmin, (req, res) => {
  const db = readDB();
  const member = { id: Date.now(), ...req.body };
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

app.post("/api/news", requireAdmin, (req, res) => {
  const db = readDB();
  db.news.push({ id: Date.now(), ...req.body });
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
  db.gallery.push({ id: Date.now(), ...req.body });
  writeDB(db);
  res.json({ ok: true });
});
app.delete("/api/gallery/:id", requireAdmin, (req, res) => {
  const db = readDB();
  db.gallery = db.gallery.filter(g => g.id != req.params.id);
  writeDB(db);
  res.json({ ok: true });
});

// === USER REGISTER/LOGIN ===
app.post("/api/register", (req, res) => {
  const db = readDB();
  const { username, email, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ ok: false, error: "Missing fields" });

  if (db.users.find(u => u.username === username))
    return res.status(400).json({ ok: false, error: "User exists" });

  db.users.push({
    username,
    email,
    password,
    role: "member",
    regDate: new Date().toISOString()
  });

  writeDB(db);
  res.json({ ok: true });
});

app.post("/api/login", (req, res) => {
  const db = readDB();
  const { username, password } = req.body;
  const u = db.users.find(u => u.username === username && u.password === password);

  if (!u) return res.status(401).json({ ok: false, error: "Invalid login" });

  res.json({ ok: true, user: { username: u.username, role: u.role } });
});

// === START SERVER ===
app.listen(PORT, () => console.log("API running on port " + PORT));
