// init_db.js
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: 'postgresql://postgres:ZhmhAaXxPUAUDccaHyKiDfpnvprwJdQl@metro.proxy.rlwy.net:44975/railway'
});

async function init() {
  try {
    console.log('🚀 Підключаємося до бази...');
    await client.connect();
    console.log('✅ Підключено!');

    await client.query(`
      CREATE TABLE IF NOT EXISTS members (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        owner TEXT,
        discord TEXT,
        youtube TEXT,
        tg TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'member',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS news (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        date TIMESTAMP NOT NULL,
        summary TEXT NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS gallery (
        id SERIAL PRIMARY KEY,
        url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('🎉 Усі таблиці створено!');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
    console.log('🔒 Підключення закрито.');
  }
}

init();
