// server.js (ESM) — Express API + Static Frontend for Railway
import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PORT
const PORT = process.env.PORT || 8080;

// Path to db.json
const DB_PATH = path.join(__dirname, "db.json");

// Admin credentials
const ADMIN_LOGIN = process.env.ADMIN_LOGIN || "famillybarracuda@gmail.com";
const ADMIN_PASS = process.env.ADMIN_PASS || "barracuda123";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "secret-change-this";

// Ensure DB exists
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
function writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
}

// Token functions
function createToken(payload) {
    return jwt.sign(payload, ADMIN_SECRET, { expiresIn: "8h" });
}
function verifyToken(token) {
    try { return jwt.verify(token, ADMIN_SECRET); }
    catch { return null; }
}
function requireAdmin(req, res, next) {
    const auth = req.headers.authorization || req.headers["x-admin-token"];
    if (!auth) return res.status(401).json({ ok: false, error: "No token" });

    const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
    const decoded = verifyToken(token);

    if (!decoded || decoded.role !== "admin")
        return res.status(403).json({ ok: false, error: "Forbidden" });

    req.admin = decoded;
    next();
}

// -------------------- AUTH --------------------
app.post("/auth/login", (req, res) => {
    const { user, pass } = req.body || {};

    if (user === ADMIN_LOGIN && pass === ADMIN_PASS) {
        const token = createToken({ role: "admin", user: ADMIN_LOGIN });
        return res.json({ ok: true, token });
    }

    return res.status(401).json({ ok: false, error: "Invalid login" });
});

// -------------------- PUBLIC API --------------------
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
    const safe = db.users.map(u => ({
        username: u.username,
        email: u.email,
        role: u.role,
        regDate: u.regDate
    }));
    res.json({ ok: true, users: safe });
});

// -------------------- ADMIN API --------------------

// Add member
app.post("/api/members", requireAdmin, (req, res) => {
    const db = readDB();
    const { name, role, owner, links } = req.body || {};

    if (!name || !role)
        return res.status(400).json({ ok: false, error: "Missing fields" });

    const member = {
        id: Date.now(),
        name,
        role,
        owner: owner || "ADMIN",
        links: links || {}
    };

    db.members.push(member);
    writeDB(db);
    res.json({ ok: true, member });
});

// Delete member
app.delete("/api/members/:id", requireAdmin, (req, res) => {
    const db = readDB();
    db.members = db.members.filter(m => m.id != req.params.id);
    writeDB(db);
    res.json({ ok: true });
});

// Add news
app.post("/api/news", requireAdmin, (req, res) => {
    const db = readDB();
    const { title, date, summary } = req.body || {};

    if (!title || !date || !summary)
        return res.status(400).json({ ok: false, error: "Missing" });

    const item = { id: Date.now(), title, date, summary };
    db.news.push(item);
    writeDB(db);
    res.json({ ok: true, item });
});

// Delete news
app.delete("/api/news/:id", requireAdmin, (req, res) => {
    const db = readDB();
    db.news = db.news.filter(n => n.id != req.params.id);
    writeDB(db);
    res.json({ ok: true });
});

// Add gallery item
app.post("/api/gallery", requireAdmin, (req, res) => {
    const db = readDB();
    const { url } = req.body || {};

    if (!url)
        return res.status(400).json({ ok: false, error: "Missing url" });

    const item = { id: Date.now(), url };
    db.gallery.push(item);
    writeDB(db);
    res.json({ ok: true, item });
});

// Delete gallery
app.delete("/api/gallery/:id", requireAdmin, (req, res) => {
    const db = readDB();
    db.gallery = db.gallery.filter(g => g.id != req.params.id);
    writeDB(db);
    res.json({ ok: true });
});

// -------------------- USER REGISTER/LOGIN --------------------
app.post("/api/register", (req, res) => {
    const db = readDB();
    const { username, email, password } = req.body || {};

    if (!username || !password)
        return res.status(400).json({ ok: false, error: "Missing" });

    if (db.users.find(u => u.username === username))
        return res.status(400).json({ ok: false, error: "Username exists" });

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
    const { username, password } = req.body || {};

    const found = db.users.find(u => u.username === username && u.password === password);

    if (!found)
        return res.status(401).json({ ok: false, error: "Invalid" });

    res.json({
        ok: true,
        user: { username: found.username, role: found.role }
    });
});

// -------------------- STATIC FRONTEND --------------------
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// -------------------- START --------------------
app.listen(PORT, () => {
    console.log("API running on port", PORT);
});
