// server.js (ESM)
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import path from "path";
import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

PORT=8080
DATABASE_URL=postgresql://postgres:ZhmhAaXxPUAUDccaHyKiDfpnvprwJdQl@metro.proxy.rlwy.net:44975/railway
ADMIN_LOGIN=famillybarracuda@gmail.com
ADMIN_PASS=barracuda123
ADMIN_SECRET=please-change-this-secret


// Database
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) console.error("❌ DATABASE_URL is missing!");

const pool = new Pool({
  connectionString: DATABASE_URL
});

// JWT
function createToken(payload) {
  return jwt.sign(payload, ADMIN_SECRET, { expiresIn: "8h" });
}
function verifyToken(token) {
  try { return jwt.verify(token, ADMIN_SECRET); } catch { return null; }
}
function requireAdmin(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ ok:false, error:"No token" });

  const t = h.startsWith("Bearer ") ? h.slice(7) : h;
  const p = verifyToken(t);
  if (!p || p.role !== "admin") return res.status(403).json({ ok:false, error:"Forbidden" });

  req.admin = p;
  next();
}

// DB helper
async function query(q, params = []) {
  const c = await pool.connect();
  try { return await c.query(q, params); }
  finally { c.release(); }
}

const app = express();
app.use(cors());
app.use(express.json());

// Static
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));


// ------------------------ AUTH ------------------------
app.post("/auth/login", (req, res) => {
  const { user, pass } = req.body;
  if (user === ADMIN_LOGIN && pass === ADMIN_PASS) {
    const token = createToken({ role: "admin", user: "ADMIN" });
    return res.json({ ok: true, token });
  }
  res.status(401).json({ ok:false, error:"Invalid credentials" });
});


// ------------------------ READ (everyone) ------------------------
app.get("/api/members", async (req, res) => {
  try {
    const r = await query(`
      SELECT id, name, role, owner, discord, youtube, tg, created_at
      FROM members ORDER BY created_at ASC
    `);
    res.json({ ok:true, members: r.rows });
  } catch (e) {
    res.status(500).json({ ok:false });
  }
});

app.get("/api/news", async (req, res) => {
  try {
    const r = await query("SELECT * FROM news ORDER BY date DESC");
    res.json({ ok:true, news: r.rows });
  } catch { res.status(500).json({ ok:false }); }
});

app.get("/api/gallery", async (req, res) => {
  try {
    const r = await query("SELECT * FROM gallery ORDER BY created_at DESC");
    res.json({ ok:true, gallery: r.rows });
  } catch { res.status(500).json({ ok:false }); }
});


// ------------------------ REGISTER / LOGIN users ------------------------
app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ ok:false, error:"Missing fields" });

  try {
    const exists = await query("SELECT 1 FROM users WHERE username=$1", [username]);
    if (exists.rowCount > 0)
      return res.status(400).json({ ok:false, error:"Username exists" });

    await query(`
      INSERT INTO users (username, email, password, role)
      VALUES ($1,$2,$3,'member')
    `, [username, email, password]);

    res.json({ ok:true });
  } catch (e) {
    res.status(500).json({ ok:false });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const r = await query(`
      SELECT username, role FROM users WHERE username=$1 AND password=$2
    `, [username, password]);
    if (r.rowCount === 0)
      return res.status(401).json({ ok:false });

    res.json({ ok:true, user: r.rows[0] });
  } catch { res.status(500).json({ ok:false }); }
});


// ------------------------ ADD MEMBER (LIMIT 1 FOR USERS) ------------------------

app.post("/api/members/userAdd", async (req, res) => {
  const { username, name, role, discord, youtube, tg } = req.body;

  if (!username || !name || !role)
    return res.status(400).json({ ok:false, error:"Missing fields" });

  try {
    const exists = await query("SELECT id FROM members WHERE owner=$1", [username]);
    if (exists.rowCount >= 1) {
      return res.json({ ok:false, limit:true, error:"User already created a member" });
    }

    await query(`
      INSERT INTO members (name, role, owner, discord, youtube, tg)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [name, role, username, discord, youtube, tg]);

    res.json({ ok:true });
  } catch (e) {
    res.status(500).json({ ok:false });
  }
});


// ------------------------ ADMIN: FULL CONTROL ------------------------
app.post("/api/members", requireAdmin, async (req, res) => {
  const { name, role, owner, discord, youtube, tg } = req.body;
  if (!name || !role)
    return res.status(400).json({ ok:false });

  try {
    await query(`
      INSERT INTO members (name, role, owner, discord, youtube, tg)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [name, role, owner || "ADMIN", discord, youtube, tg]);

    res.json({ ok:true });
  } catch (e) {
    res.status(500).json({ ok:false });
  }
});

app.delete("/api/members/:id", requireAdmin, async (req, res) => {
  try {
    await query("DELETE FROM members WHERE id=$1", [req.params.id]);
    res.json({ ok:true });
  } catch { res.status(500).json({ ok:false }); }
});


// NEWS
app.post("/api/news", requireAdmin, async (req, res) => {
  const { title, date, summary } = req.body;
  if (!title || !date || !summary) return res.status(400).json({ ok:false });

  try {
    await query("INSERT INTO news (title, date, summary) VALUES ($1,$2,$3)",
      [title, date, summary]);
    res.json({ ok:true });
  } catch { res.status(500).json({ ok:false }); }
});

app.delete("/api/news/:id", requireAdmin, async (req, res) => {
  try {
    await query("DELETE FROM news WHERE id=$1", [req.params.id]);
    res.json({ ok:true });
  } catch { res.status(500).json({ ok:false }); }
});


// GALLERY
app.post("/api/gallery", requireAdmin, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ ok:false });

  try {
    await query("INSERT INTO gallery (url) VALUES ($1)", [url]);
    res.json({ ok:true });
  } catch { res.status(500).json({ ok:false }); }
});

app.delete("/api/gallery/:id", requireAdmin, async (req, res) => {
  try {
    await query("DELETE FROM gallery WHERE id=$1", [req.params.id]);
    res.json({ ok:true });
  } catch { res.status(500).json({ ok:false }); }
});


// ----------------------------------------
app.listen(PORT, () => {
  console.log("🚀 API running on " + PORT);
});
