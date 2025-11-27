// server.js (ESM)
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import path from "path";
import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;
const ADMIN_LOGIN = process.env.ADMIN_LOGIN || "famillybarracuda@gmail.com";
const ADMIN_PASS = process.env.ADMIN_PASS || "barracuda123";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "please-change-this-secret";

// --- DATABASE ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- TOKEN UTILS ---
function createToken(payload) {
  return jwt.sign(payload, ADMIN_SECRET, { expiresIn: "8h" });
}
function verifyToken(token) {
  try { return jwt.verify(token, ADMIN_SECRET); } catch { return null; }
}

// --- MIDDLEWARE ---
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ ok: false, error: "NO_TOKEN" });

  const token = header.replace("Bearer ", "");
  const data = verifyToken(token);
  if (!data) return res.status(403).json({ ok: false, error: "BAD_TOKEN" });

  req.user = data;
  next();
}
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin")
    return res.status(403).json({ ok: false, error: "ADMIN_ONLY" });
  next();
}

const app = express();
app.use(cors());
app.use(express.json());

// STATIC
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- AUTH (ADMIN) ---
app.post("/auth/login", (req, res) => {
  const { user, pass } = req.body;
  if (user === ADMIN_LOGIN && pass === ADMIN_PASS) {
    const token = createToken({ role: "admin", username: "ADMIN" });
    return res.json({ ok: true, token });
  }
  res.status(401).json({ ok: false, error: "INVALID" });
});

// --- USER REGISTER + LOGIN ---
app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ ok: false, error: "MISSING" });

  try {
    const exists = await pool.query(
      "SELECT 1 FROM users WHERE username=$1",
      [username]
    );
    if (exists.rowCount)
      return res.status(400).json({ ok: false, error: "USERNAME_EXISTS" });

    await pool.query(
      "INSERT INTO users (username, email, password, role) VALUES ($1,$2,$3,'user')",
      [username, email, password]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const r = await pool.query(
      "SELECT username, role FROM users WHERE username=$1 AND password=$2",
      [username, password]
    );
    if (!r.rowCount)
      return res.status(401).json({ ok: false, error: "INVALID" });

    const token = createToken({
      username: r.rows[0].username,
      role: r.rows[0].role
    });

    res.json({ ok: true, token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

// ========== PUBLIC GET ROUTES ==========
app.get("/api/members", async (req, res) => {
  const r = await pool.query("SELECT * FROM members ORDER BY created_at DESC");
  res.json({ ok: true, members: r.rows });
});
app.get("/api/news", async (req, res) => {
  const r = await pool.query("SELECT * FROM news ORDER BY date DESC");
  res.json({ ok: true, news: r.rows });
});
app.get("/api/gallery", async (req, res) => {
  const r = await pool.query("SELECT * FROM gallery ORDER BY created_at DESC");
  res.json({ ok: true, gallery: r.rows });
});

// ========== ADD MEMBER (ADMIN OR USER 1 ONLY) ==========
app.post("/api/members", requireAuth, async (req, res) => {
  const { name, role, discord, youtube, tg } = req.body;
  const owner = req.user.username;

  if (!name || !role)
    return res.status(400).json({ ok: false, error: "MISSING_FIELDS" });

  try {
    // --- LIMIT: ordinary user can add only 1 member ---
    if (req.user.role !== "admin") {
      const count = await pool.query(
        "SELECT COUNT(*) FROM members WHERE owner=$1",
        [owner]
      );
      if (Number(count.rows[0].count) >= 1)
        return res.status(403).json({ ok: false, error: "LIMIT_REACHED" });
    }

    await pool.query(
      `INSERT INTO members (name, role, owner, discord, youtube, tg)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [name, role, owner, discord, youtube, tg]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

// ========== ADMIN NEWS ==========
app.post("/api/news", requireAuth, requireAdmin, async (req, res) => {
  const { title, date, summary } = req.body;
  await pool.query(
    "INSERT INTO news (title, date, summary) VALUES ($1,$2,$3)",
    [title, date, summary]
  );
  res.json({ ok: true });
});
app.delete("/api/news/:id", requireAuth, requireAdmin, async (req, res) => {
  await pool.query("DELETE FROM news WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

// ========== ADMIN GALLERY ==========
app.post("/api/gallery", requireAuth, requireAdmin, async (req, res) => {
  await pool.query("INSERT INTO gallery (url) VALUES ($1)", [req.body.url]);
  res.json({ ok: true });
});
app.delete("/api/gallery/:id", requireAuth, requireAdmin, async (req, res) => {
  await pool.query("DELETE FROM gallery WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

// START
app.listen(PORT, () => console.log("API running on", PORT));
