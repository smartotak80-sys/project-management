// server.js
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000; 
// process.env.PORT забезпечує, що Railway або інший хост 
// зможе вказати порт, на якому сервер повинен слухати.

// Визначення каталогу, де знаходяться ваші статичні файли (index.html, styles.css, script.js)
// У нашому випадку це кореневий каталог (path.join(__dirname, '/'))
app.use(express.static(path.join(__dirname, '/')));

// Обробка всіх інших запитів: 
// якщо Express не знайшов потрібний файл (наприклад, /about), 
// він перенаправляє на index.html.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер працює на порту ${PORT}`);
});
