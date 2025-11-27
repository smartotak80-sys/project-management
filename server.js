import express from "express";
import cors from "cors";
import pg from "pg";

const app = express();
app.use(cors());
app.use(express.json());

// ---- DATABASE ----
const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ---- CREATE TABLES IF NOT EXISTS ----
async function initDB() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS members (
      id SERIAL PRIMARY KEY,
      name TEXT,
      role TEXT,
      discord TEXT,
      youtube TEXT,
      tg TEXT
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS news (
      id SERIAL PRIMARY KEY,
      title TEXT,
      date TEXT,
      summary TEXT
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS gallery (
      id SERIAL PRIMARY KEY,
      url TEXT
    );
  `);

  console.log("DB READY ✔");
}
initDB();

// ----------- MEMBERS API --------------------

app.get("/api/members", async (req, res) => {
  const result = await db.query("SELECT * FROM members ORDER BY id DESC");
  res.json(result.rows);
});

app.post("/api/members", async (req, res) => {
  const { name, role, discord, youtube, tg } = req.body;

  const result = await db.query(
    "INSERT INTO members (name, role, discord, youtube, tg) VALUES ($1,$2,$3,$4,$5) RETURNING *",
    [name, role, discord, youtube, tg]
  );

  res.json(result.rows[0]);
});

app.delete("/api/members/:id", async (req, res) => {
  const id = req.params.id;
  await db.query("DELETE FROM members WHERE id=$1", [id]);
  res.json({ success: true });
});

// ----------- NEWS API ------------------------

app.get("/api/news", async (req, res) => {
  const result = await db.query("SELECT * FROM news ORDER BY id DESC");
  res.json(result.rows);
});

app.post("/api/news", async (req, res) => {
  const { title, date, summary } = req.body;

  const result = await db.query(
    "INSERT INTO news (title,date,summary) VALUES ($1,$2,$3) RETURNING *",
    [title, date, summary]
  );

  res.json(result.rows[0]);
});

app.delete("/api/news/:id", async (req, res) => {
  const id = req.params.id;
  await db.query("DELETE FROM news WHERE id=$1", [id]);
  res.json({ success: true });
});

// ----------- GALLERY API ---------------------

app.get("/api/gallery", async (req, res) => {
  const result = await db.query("SELECT * FROM gallery ORDER BY id DESC");
  res.json(result.rows);
});

app.post("/api/gallery", async (req, res) => {
  const { url } = req.body;

  const result = await db.query(
    "INSERT INTO gallery (url) VALUES ($1) RETURNING *",
    [url]
  );

  res.json(result.rows[0]);
});

app.delete("/api/gallery/:id", async (req, res) => {
  const id = req.params.id;
  await db.query("DELETE FROM gallery WHERE id=$1", [id]);
  res.json({ success: true });
});

// ---- START SERVER ----
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("API running on port", PORT));
