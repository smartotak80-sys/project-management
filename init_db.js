// init_db.js
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function init() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        email TEXT,
        password TEXT,
        role TEXT DEFAULT 'user'
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS members (
        id SERIAL PRIMARY KEY,
        name TEXT,
        role TEXT,
        owner TEXT,
        discord TEXT,
        youtube TEXT,
        tg TEXT,
        created_at TIMESTAMP DEFAULT now()
      );
    `);

    console.log("DB initialized");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

init();
