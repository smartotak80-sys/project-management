// server.js - Оновлений для MongoDB
require('dotenv').config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;
// Використовує змінну середовища MONGODB_URI, яку ви налаштували на Railway
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/barakuda_db';

// --- НАЛАШТУВАННЯ БАЗИ ДАНИХ (MongoDB) ---
mongoose.connect(MONGODB_URI)
    .then(() => console.log("MongoDB Connected Successfully"))
    .catch(err => console.error("MongoDB Connection Error:", err));

// Визначення Схем
const memberSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    owner: { type: String, required: true }, 
    links: {
        discord: String,
        youtube: String,
        tg: String
    }
});
const newsSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    date: { type: String, required: true },
    summary: { type: String, required: true }
});
const gallerySchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    url: { type: String, required: true }
});
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, unique: true, sparse: true },
    password: { type: String, required: true },
    role: { type: String, default: 'member' },
    regDate: { type: Date, default: Date.now }
});

const Member = mongoose.model('Member', memberSchema);
const News = mongoose.model('News', newsSchema);
const Gallery = mongoose.model('Gallery', gallerySchema);
const User = mongoose.model('User', userSchema);

// --- Middleware ---
app.use(express.json()); // Для обробки JSON-тіла запитів
app.use(express.static(path.join(__dirname, "public")));

// --- ФІКСОВАНІ КОНСТАНТИ ---
const ADMIN_LOGIN = 'famillybarracuda@gmail.com'; 
const ADMIN_PASS = 'barracuda123';
const MAX_USERS = 100; 
const MAX_MEMBER_PER_USER = 1;


// --- ДОПОМІЖНІ ФУНКЦІЇ ДЛЯ АВТЕНТИФІКАЦІЇ/АВТОРИЗАЦІЇ ---
const authenticateAdmin = (req, res, next) => {
    // Використовуємо кастомні заголовки для імітації аутентифікації
    if (req.headers['x-auth-user'] !== 'ADMIN 🦈' || req.headers['x-auth-role'] !== 'admin') {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    next();
};

const authenticateUser = (req, res, next) => {
    if (!req.headers['x-auth-user']) {
        return res.status(401).json({ message: "Unauthorized: Login required" });
    }
    req.currentUser = { 
        username: req.headers['x-auth-user'], 
        role: req.headers['x-auth-role'] 
    };
    next();
};


// --- API ЕНДПОІНТИ (РОУТИ) ---

// 1. АУТЕНТИФІКАЦІЯ
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (username === ADMIN_LOGIN && password === ADMIN_PASS) {
        return res.json({ 
            success: true, 
            user: { username: 'ADMIN 🦈', role: 'admin' }, 
            message: 'Ласкаво просимо, Адмін!' 
        });
    }

    const user = await User.findOne({ username, password });
    if (user) {
        return res.json({ 
            success: true, 
            user: { username: user.username, role: user.role }, 
            message: `Вітаємо, ${user.username}!` 
        });
    } else {
        res.status(401).json({ success: false, message: 'Невірні дані (логін або пароль)' });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    const regularUsersCount = await User.countDocuments({ role: { $ne: 'admin' } });
    if (regularUsersCount >= MAX_USERS) {
        return res.status(400).json({ success: false, message: `Досягнуто ліміту користувачів (${MAX_USERS}).` });
    }
    
    if (!username || !password || username.length < 3 || password.length < 6) {
        return res.status(400).json({ success: false, message: 'Некоректні дані' });
    }

    try {
        const newUser = new User({ username, email, password, role: 'member', id: Date.now() });
        await newUser.save();
        res.json({ success: true, message: 'Реєстрація успішна. Тепер можете увійти.' });
    } catch (error) {
        if (error.code === 11000) { 
            return res.status(400).json({ success: false, message: 'Логін або Email вже використовуються' });
        }
        res.status(500).json({ success: false, message: 'Помилка сервера при реєстрації' });
    }
});

app.get('/api/users/count', async (req, res) => {
    const totalUsers = await User.countDocuments();
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    res.json({ totalUsers, totalAdmins });
});

app.get('/api/users', authenticateAdmin, async (req, res) => {
    const users = await User.find({}, { password: 0 });
    res.json(users);
});

app.delete('/api/users/:username', authenticateAdmin, async (req, res) => {
    const { username } = req.params;
    
    await User.deleteOne({ username });
    await Member.deleteMany({ owner: username });

    res.json({ success: true, message: `Користувача ${username} видалено.` });
});


// 2. УЧАСНИКИ (Members)
app.get('/api/members', async (req, res) => {
    const members = await Member.find().sort({ name: 1 });
    res.json(members);
});

app.post('/api/members', authenticateUser, async (req, res) => {
    const { name, role, discord, youtube, tg } = req.body;
    const owner = req.currentUser.username;
    
    const isLimited = req.currentUser.role !== 'admin';
    if (isLimited) {
        const userMembersCount = await Member.countDocuments({ owner });
        if (userMembersCount >= MAX_MEMBER_PER_USER) {
            return res.status(400).json({ message: `Ви досягли ліміту (${MAX_MEMBER_PER_USER}) учасників.` });
        }
    }
    
    const newMember = new Member({
        id: Date.now(),
        name,
        role,
        owner,
        links: { discord, youtube, tg }
    });
    
    await newMember.save();
    res.json({ success: true, member: newMember });
});

app.put('/api/members/:id', authenticateUser, async (req, res) => {
    const { id } = req.params;
    const { name, role, discord, youtube, tg } = req.body;
    
    const member = await Member.findOne({ id });
    if (!member) return res.status(404).json({ message: 'Учасника не знайдено' });

    const isOwner = req.currentUser.username === member.owner;
    const isAdmin = req.currentUser.role === 'admin';
    if (!isAdmin && !isOwner) {
        return res.status(403).json({ message: 'Недостатньо прав для редагування цього учасника.' });
    }

    member.name = name;
    member.role = role;
    member.links = { discord, youtube, tg };
    await member.save();

    res.json({ success: true, member });
});

app.delete('/api/members/:id', authenticateUser, async (req, res) => {
    const { id } = req.params;
    const member = await Member.findOne({ id });
    if (!member) return res.status(404).json({ message: 'Учасника не знайдено' });

    const isOwner = req.currentUser.username === member.owner;
    const isAdmin = req.currentUser.role === 'admin';
    if (!isAdmin && !isOwner) {
        return res.status(403).json({ message: 'Недостатньо прав для видалення цього учасника.' });
    }
    
    await Member.deleteOne({ id });
    res.json({ success: true, message: 'Учасника видалено.' });
});


// 3. НОВИНИ (News)
app.get('/api/news', async (req, res) => {
    const news = await News.find().sort({ id: -1 }); 
    res.json(news);
});

app.post('/api/news', authenticateAdmin, async (req, res) => {
    const { title, date, summary } = req.body;
    if (!title || !date || !summary) {
        return res.status(400).json({ message: 'Заповніть усі поля' });
    }

    const newNews = new News({ id: Date.now(), title, date, summary });
    await newNews.save();
    res.json({ success: true, news: newNews });
});

app.delete('/api/news/:id', authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    await News.deleteOne({ id });
    res.json({ success: true, message: 'Новину видалено.' });
});


// 4. ГАЛЕРЕЯ (Gallery)
app.get('/api/gallery', async (req, res) => {
    const gallery = await Gallery.find();
    res.json(gallery);
});

app.post('/api/gallery', authenticateAdmin, async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ message: 'Вкажіть коректне посилання на зображення' });
    }
    
    const newGalleryItem = new Gallery({ id: Date.now(), url });
    await newGalleryItem.save();
    res.json({ success: true, item: newGalleryItem });
});

app.delete('/api/gallery/:id', authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    await Gallery.deleteOne({ id });
    res.json({ success: true, message: 'Фото видалено.' });
});


// 5. ОСНОВНИЙ РОУТ (index.html)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- СТАРТ СЕРВЕРА ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
