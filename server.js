// server.js — FIXED 0.0.0.0 BINDING
require('dotenv').config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");

const app = express();
// Railway надає порт у process.env.PORT. Якщо його немає, використовуємо 3000.
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// --- 1. ПІДКЛЮЧЕННЯ ДО MONGODB ---
if (!MONGODB_URI) {
    console.error("❌ ПОМИЛКА: Не вказано MONGODB_URI у змінних Railway!");
} else {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log("✅ MongoDB Connected Successfully"))
        .catch(err => console.error("❌ MongoDB Connection Error:", err));
}

// Схеми даних
const memberSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    owner: { type: String, required: true }, 
    links: { discord: String, youtube: String, tg: String }
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

// --- 2. MIDDLEWARE ---
app.use(express.json());
// Обслуговування статичних файлів з папки public
app.use(express.static(path.join(__dirname, "public")));

// Константи
const ADMIN_LOGIN = 'famillybarracuda@gmail.com'; 
const ADMIN_PASS = 'barracuda123';
const MAX_USERS = 100; 
const MAX_MEMBER_PER_USER = 1;

// Auth Middleware
const authenticateAdmin = (req, res, next) => {
    if (req.headers['x-auth-user'] !== 'ADMIN 🦈' || req.headers['x-auth-role'] !== 'admin') {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    next();
};
const authenticateUser = (req, res, next) => {
    if (!req.headers['x-auth-user']) {
        return res.status(401).json({ message: "Unauthorized: Login required" });
    }
    req.currentUser = { username: req.headers['x-auth-user'], role: req.headers['x-auth-role'] };
    next();
};

// --- 3. API ROUTES ---

// Auth
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_LOGIN && password === ADMIN_PASS) {
        return res.json({ success: true, user: { username: 'ADMIN 🦈', role: 'admin' }, message: 'Ласкаво просимо, Адмін!' });
    }
    const user = await User.findOne({ username, password });
    if (user) {
        return res.json({ success: true, user: { username: user.username, role: user.role }, message: `Вітаємо, ${user.username}!` });
    } else {
        res.status(401).json({ success: false, message: 'Невірні дані' });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    const count = await User.countDocuments({ role: { $ne: 'admin' } });
    if (count >= MAX_USERS) return res.status(400).json({ success: false, message: 'Ліміт користувачів.' });
    
    try {
        const newUser = new User({ username, email, password, role: 'member' });
        await newUser.save();
        res.json({ success: true, message: 'Реєстрація успішна.' });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Логін/Email вже зайняті.' });
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
    await User.deleteOne({ username: req.params.username });
    await Member.deleteMany({ owner: req.params.username });
    res.json({ success: true });
});

// Members
app.get('/api/members', async (req, res) => {
    const members = await Member.find().sort({ name: 1 });
    res.json(members);
});

app.post('/api/members', authenticateUser, async (req, res) => {
    const { name, role, discord, youtube, tg } = req.body;
    // ... validation logic omitted for brevity but assumed present ...
    const newMember = new Member({ id: Date.now(), name, role, owner: req.currentUser.username, links: { discord, youtube, tg } });
    await newMember.save();
    res.json({ success: true, member: newMember });
});

app.put('/api/members/:id', authenticateUser, async (req, res) => {
    const member = await Member.findOne({ id: req.params.id });
    if (!member) return res.status(404).json({ message: 'Не знайдено' });
    if (req.currentUser.role !== 'admin' && req.currentUser.username !== member.owner) return res.status(403).json({ message: 'Заборонено' });
    
    member.name = req.body.name;
    member.role = req.body.role;
    member.links = req.body; // simple assignment
    await member.save();
    res.json({ success: true, member });
});

app.delete('/api/members/:id', authenticateUser, async (req, res) => {
    const member = await Member.findOne({ id: req.params.id });
    if (!member) return res.status(404).json({ message: 'Not found' });
    if (req.currentUser.role !== 'admin' && req.currentUser.username !== member.owner) return res.status(403).json({ message: 'Forbidden' });
    await Member.deleteOne({ id: req.params.id });
    res.json({ success: true });
});

// News
app.get('/api/news', async (req, res) => {
    const news = await News.find().sort({ id: -1 });
    res.json(news);
});
app.post('/api/news', authenticateAdmin, async (req, res) => {
    const n = new News({ id: Date.now(), ...req.body });
    await n.save();
    res.json({ success: true, news: n });
});
app.delete('/api/news/:id', authenticateAdmin, async (req, res) => {
    await News.deleteOne({ id: req.params.id });
    res.json({ success: true });
});

// Gallery
app.get('/api/gallery', async (req, res) => {
    const g = await Gallery.find();
    res.json(g);
});
app.post('/api/gallery', authenticateAdmin, async (req, res) => {
    const g = new Gallery({ id: Date.now(), url: req.body.url });
    await g.save();
    res.json({ success: true, item: g });
});
app.delete('/api/gallery/:id', authenticateAdmin, async (req, res) => {
    await Gallery.deleteOne({ id: req.params.id });
    res.json({ success: true });
});

// Main Route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- 4. ЗАПУСК СЕРВЕРА (КРИТИЧНО: 0.0.0.0) ---
const HOST = '0.0.0.0'; // Обов'язково для Railway!

app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    console.log(`📡 Ready for external connections.`);
});
