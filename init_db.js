// init_db.js
const { Client } = require('pg');

// Встав сюди свій Connection URL з Railway
const connectionString = 'postgresql://postgres:ZhmhAaXxPUAUDccaHyKiDfpnvprwJdQl@metro.proxy.rlwy.net:44975/railway';

const client = new Client({
  connectionString,
});

async function createTables() {
  try {
    await client.connect();
    console.log('✅ Підключено до бази!');

    // Таблиця members
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

    // Таблиця users
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

    // Таблиця news
    await client.query(`
      CREATE TABLE IF NOT EXISTS news (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        date TIMESTAMP NOT NULL,
        summary TEXT NOT NULL
      );
    `);

    // Таблиця gallery
    await client.query(`
      CREATE TABLE IF NOT EXISTS gallery (
        id SERIAL PRIMARY KEY,
        url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('🎉 Усі таблиці створено успішно!');
  } catch (err) {
    console.error('❌ Помилка:', err);
  } finally {
    await client.end();
    console.log('🔒 Підключення закрито.');
  }
}

createTables();
