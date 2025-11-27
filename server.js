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

// DATABASE_URL must be set in Railway env
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set. Set it in environment variables.");
  // continue — but DB calls will fail
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  // If Railway requires SSL settings, enable them here (optional)
  // ssl: { rejectUnauthorized: false }
});

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

const app = express();
app.use(cors());
app.use(express.json());

// serve client files from /public
app.use(express.static(path.join(__dirname, "public")));

// quick health
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

// --- AUTH ---
app.post("/auth/login", (req, res) => {
  const { user, pass } = req.body || {};
  if (user === ADMIN_LOGIN && pass === ADMIN_PASS) {
    const token = createToken({ role: "admin", user: "ADMIN" });
    return res.json({ ok: true, token });
  }
  return res.status(401).json({ ok: false, error: "Invalid credentials" });
});

// --- HELPERS: wrap DB calls ---
async function query(q, params=[]) {
  const client = await pool.connect();
  try {
    const r = await client.query(q, params);
    return r;
  } finally {
    client.release();
  }
}

// --- PUBLIC READ ROUTES ---
app.get("/api/members", async (req, res) => {
  try {
    const r = await query("SELECT id, name, role, owner, discord, youtube, tg, created_at FROM members ORDER BY created_at ASC");
    const members = r.rows.map(row => ({
      id: row.id,
      name: row.name,
      role: row.role,
      owner: row.owner,
      links: { discord: row.discord, youtube: row.youtube, tg: row.tg },
      created_at: row.created_at
    }));
    res.json({ ok: true, members });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error: "db" });
  }
});

app.get("/api/news", async (req, res) => {
  try {
    const r = await query("SELECT id, title, date, summary, created_at FROM news ORDER BY date DESC, created_at DESC");
    res.json({ ok: true, news: r.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error: "db" });
  }
});

app.get("/api/gallery", async (req, res) => {
  try {
    const r = await query("SELECT id, url, created_at FROM gallery ORDER BY created_at DESC");
    res.json({ ok: true, gallery: r.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error: "db" });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const r = await query("SELECT username, email, role, reg_date FROM users ORDER BY reg_date DESC");
    res.json({ ok: true, users: r.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error: "db" });
  }
});

// --- ADMIN WRITE ROUTES (requireAdmin) ---
// Add member (admin)
app.post("/api/members", requireAdmin, async (req, res) => {
  const { name, role, owner, links } = req.body || {};
  if (!name || !role) return res.status(400).json({ ok:false, error: "Missing" });
  try {
    const r = await query(
      `INSERT INTO members (name, role, owner, discord, youtube, tg) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [name, role, owner || 'ADMIN', links?.discord||null, links?.youtube||null, links?.tg||null]
    );
    res.json({ ok:true, member: { id: r.rows[0].id }});
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error: "db" });
  }
});

app.delete("/api/members/:id", requireAdmin, async (req, res) => {
  try {
    await query("DELETE FROM members WHERE id = $1", [req.params.id]);
    res.json({ ok:true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false });
  }
});

// NEWS
app.post("/api/news", requireAdmin, async (req, res) => {
  const { title, date, summary } = req.body || {};
  if(!title||!date||!summary) return res.status(400).json({ ok:false });
  try {
    await query("INSERT INTO news (title, date, summary) VALUES ($1,$2,$3)", [title, date, summary]);
    res.json({ ok:true });
  } catch(e){ console.error(e); res.status(500).json({ ok:false }); }
});
app.delete("/api/news/:id", requireAdmin, async (req, res) => {
  try { await query("DELETE FROM news WHERE id=$1", [req.params.id]); res.json({ ok:true }); }
  catch(e){ console.error(e); res.status(500).json({ ok:false }); }
});

// GALLERY
app.post("/api/gallery", requireAdmin, async (req, res) => {
  const { url } = req.body || {};
  if(!url) return res.status(400).json({ ok:false });
  try { await query("INSERT INTO gallery (url) VALUES ($1)", [url]); res.json({ ok:true }); }
  catch(e){ console.error(e); res.status(500).json({ ok:false }); }
});
app.delete("/api/gallery/:id", requireAdmin, async (req, res) => {
  try { await query("DELETE FROM gallery WHERE id=$1", [req.params.id]); res.json({ ok:true }); }
  catch(e){ console.error(e); res.status(500).json({ ok:false }); }
});

// USER REGISTER + LOGIN (simple)
app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body || {};
  if(!username || !password) return res.status(400).json({ ok:false, error:'missing' });
  try {
    const exists = await query("SELECT 1 FROM users WHERE username=$1", [username]);
    if (exists.rowCount > 0) return res.status(400).json({ ok:false, error:'Username exists' });
    await query("INSERT INTO users (username, email, password, role) VALUES ($1,$2,$3,$4)", [username, email||null, password, 'member']);
    res.json({ ok:true });
  } catch(e){ console.error(e); res.status(500).json({ ok:false }); }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body || {};
  if(!username || !password) return res.status(400).json({ ok:false });
  try {
    const r = await query("SELECT username, role FROM users WHERE username=$1 AND password=$2", [username, password]);
    if (r.rowCount === 0) return res.status(401).json({ ok:false, error:'Invalid' });
    res.json({ ok:true, user: r.rows[0] });
  } catch(e){ console.error(e); res.status(500).json({ ok:false }); }
});

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
