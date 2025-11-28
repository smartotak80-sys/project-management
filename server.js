require('dotenv').config(); // Підключення змінних середовища
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Отримання посилання на базу даних з файлу .env або локальний фолбек
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/barracuda_db";

// --- ПІДКЛЮЧЕННЯ ДО MONGODB ---
mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log("✅ БАЗА ДАНИХ ПІДКЛЮЧЕНА (MongoDB)");
        // Видалення старого індексу galleries, щоб уникнути конфліктів ID
        try { await mongoose.connection.db.collection('galleries').dropIndex('id_1'); } catch (e) {}
    })
    .catch(err => {
        console.error("❌ ПОМИЛКА ПІДКЛЮЧЕННЯ ДО БД:", err.message);
        console.log("Перевірте файл .env та доступ Network Access в MongoDB Atlas");
    });

app.use(cors());
app.use(bodyParser.json());
// Обслуговування статичних файлів (HTML, CSS, JS, зображення)
app.use(express.static(path.join(__dirname, "public")));

// --- СХЕМИ БАЗИ ДАНИХ (MODELS) ---

// 1. Користувачі (облікові записи для входу)
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    password: { type: String, required: true }, 
    role: { type: String, default: 'member' }, // 'admin' або 'member'
    regDate: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// 2. Учасники сім'ї (картки на головній)
const MemberSchema = new mongoose.Schema({
    name: String,
    role: String,
    owner: String, // Логін користувача, який створив картку
    links: { 
        discord: String, 
        youtube: String, 
        tg: String 
    },
    createdAt: { type: Date, default: Date.now }
});
const Member = mongoose.model('Member', MemberSchema);

// 3. Новини (для слайдера)
const NewsSchema = new mongoose.Schema({ 
    title: String, 
    date: String, 
    summary: String, 
    createdAt: { type: Date, default: Date.now } 
});
const News = mongoose.model('News', NewsSchema);

// 4. Галерея (фото)
const GallerySchema = new mongoose.Schema({ 
    url: String, 
    createdAt: { type: Date, default: Date.now } 
});
const Gallery = mongoose.model('Gallery', GallerySchema);

// --- API МАРШРУТИ ---

// >> АВТОРИЗАЦІЯ
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        // Перевірка на дублікати
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Такий користувач або Email вже існує' });
        }
        // Створення нового користувача
        const newUser = new User({ username, email, password, role: 'member' });
        await newUser.save();
        res.json({ success: true, message: 'Реєстрація успішна! Увійдіть.' });
    } catch (err) { 
        res.status(500).json({ success: false, message: 'Помилка сервера' }); 
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    // Вбудований СУПЕР-АДМІН (залиште цей код для доступу, якщо забудете пароль від БД)
    if(username === 'famillybarracuda@gmail.com' && password === 'barracuda123') {
         return res.json({ success: true, user: { username: 'ADMIN 🦈', role: 'admin' } });
    }

    try {
        const user = await User.findOne({ username, password });
        if (user) {
            res.json({ success: true, user: { username: user.username, role: user.role } });
        } else {
            res.status(401).json({ success: false, message: 'Невірний логін або пароль' });
        }
    } catch (err) { res.status(500).json({ success: false }); }
});

// >> УЧАСНИКИ
app.get('/api/members', async (req, res) => {
    // Отримати список, нові зверху
    const members = await Member.find().sort({ createdAt: -1 });
    res.json(members.map(m => ({ ...m._doc, id: m._id })));
});

app.post('/api/members', async (req, res) => {
    try {
        const ownerName = req.body.owner;
        const currentUser = await User.findOne({ username: ownerName });
        
        // ПЕРЕВІРКА ЛІМІТУ: Якщо не адмін, то макс. 1 учасник
        if (currentUser && currentUser.role !== 'admin') {
            const count = await Member.countDocuments({ owner: ownerName });
            if (count >= 1) {
                return res.status(403).json({ success: false, message: 'ЛІМІТ: Ви можете створити лише 1 учасника.' });
            }
        }

        const newMember = new Member(req.body);
        await newMember.save(); 
        res.json({ success: true }); 
    } catch(e) { 
        res.status(500).json({ success: false, error: e.message }); 
    }
});

app.put('/api/members/:id', async (req, res) => {
    try {
        await Member.findByIdAndUpdate(req.params.id, req.body);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.delete('/api/members/:id', async (req, res) => {
    try {
        await Member.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// >> НОВИНИ (ДЛЯ СЛАЙДЕРА)
app.get('/api/news', async (req, res) => {
    const news = await News.find().sort({ createdAt: -1 });
    res.json(news.map(n => ({ ...n._doc, id: n._id })));
});
app.post('/api/news', async (req, res) => {
    await new News(req.body).save();
    res.json({ success: true });
});
app.delete('/api/news/:id', async (req, res) => {
    await News.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// >> ГАЛЕРЕЯ
app.get('/api/gallery', async (req, res) => {
    const gallery = await Gallery.find().sort({ createdAt: -1 });
    res.json(gallery.map(g => ({ ...g._doc, id: g._id })));
});
app.post('/api/gallery', async (req, res) => {
    await new Gallery(req.body).save();
    res.json({ success: true });
});
app.delete('/api/gallery/:id', async (req, res) => {
    await Gallery.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// >> АДМІН-ПАНЕЛЬ: УПРАВЛІННЯ КОРИСТУВАЧАМИ
app.get('/api/users', async (req, res) => {
    // Список всіх зареєстрованих
    const users = await User.find().sort({ regDate: -1 });
    res.json(users);
});

app.delete('/api/users/:username', async (req, res) => {
    try {
        // Видалення акаунту
        await User.findOneAndDelete({ username: req.params.username });
        // Видалення всіх учасників, створених цим акаунтом (каскадне видалення)
        await Member.deleteMany({ owner: req.params.username });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/users/count', async (req, res) => {
    // Статистика для віджетів
    const total = await User.countDocuments();
    const admins = await User.countDocuments({ role: 'admin' });
    res.json({ totalUsers: total, totalAdmins: admins, maxUsers: 50 });
});

// Завжди віддавати index.html для будь-яких інших запитів (SPA fallback)
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер Barracuda Family запущено на порту ${PORT}`);
});
