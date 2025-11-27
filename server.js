// server.js — LIMIT 1 USER
require('dotenv').config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// --- 1. ПІДКЛЮЧЕННЯ ДО MONGODB ---
if (!MONGODB_URI) {
    console.error("❌ ПОМИЛКА: Не вказано MONGODB_URI!");
} else {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log("✅ MongoDB Connected"))
        .catch(err => console.error("❌ MongoDB Error:", err));
}

// Схеми
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

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- НАЛАШТУВАННЯ ---
const ADMIN_LOGIN = 'famillybarracuda@gmail.com'; 
const ADMIN_PASS = 'barracuda123';
const MAX_USERS = 1; // <--- ТІЛЬКИ 1 АКАУНТ
const MAX_MEMBER_PER_USER = 1;

// Auth Middleware (Decoder)
const authenticateAdmin = (req, res, next) => {
    const user = req.headers['x-auth-user'] ? decodeURIComponent(req.headers['x-auth-user']) : '';
    const role = req.headers['x-auth-role'] ? decodeURIComponent(req.headers['x-auth-role']) : '';
    if (user !== 'ADMIN 🦈' || role !== 'admin') return res.status(403).json({ message: "Forbidden" });
    next();
};
const authenticateUser = (req, res, next) => {
    if (!req.headers['x-auth-user']) return res.status(401).json({ message: "Login required" });
    req.currentUser = { 
        username: decodeURIComponent(req.headers['x-auth-user']), 
        role: decodeURIComponent(req.headers['x-auth-role']) 
    };
    next();
};

// --- ROUTES ---

// Auth
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_LOGIN && password === ADMIN_PASS) {
        return res.json({ success: true, user: { username: 'ADMIN 🦈', role: 'admin' }, message: 'Welcome Admin!' });
    }
    const user = await User.findOne({ username, password });
    if (user) {
        return res.json({ success: true, user: { username: user.username, role: user.role }, message: `Welcome ${user.username}!` });
    }
    res.status(401).json({ success: false, message: 'Невірні дані' });
});

app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    // Перевіряємо загальну кількість користувачів у базі
    const count = await User.countDocuments();
    
    if (count >= MAX_USERS) {
        return res.status(400).json({ success: false, message: 'Реєстрацію закрито. Ліміт користувачів вичерпано.' });
    }
    
    try {
        const newUser = new User({ username, email, password, role: 'member' });
        await newUser.save();
        res.json({ success: true, message: 'Акаунт створено успішно!' });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Цей логін або email вже зайнятий.' });
    }
});

app.get('/api/users/count', async (req, res) => {
    const totalUsers = await User.countDocuments();
    res.json({ totalUsers, maxUsers: MAX_USERS });
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

// Content Routes
app.get('/api/members', async (req, res) => { res.json(await Member.find().sort({ name: 1 })); });
app.post('/api/members', authenticateUser, async (req, res) => {
    const { name, role, discord, youtube, tg } = req.body;
    await new Member({ id: Date.now(), name, role, owner: req.currentUser.username, links: { discord, youtube, tg } }).save();
    res.json({ success: true });
});
app.put('/api/members/:id', authenticateUser, async (req, res) => {
    const m = await Member.findOne({ id: req.params.id });
    if(!m) return res.status(404).json({message:'Not found'});
    if(req.currentUser.role!=='admin' && req.currentUser.username!==m.owner) return res.status(403).json({message:'Forbidden'});
    m.name=req.body.name; m.role=req.body.role; m.links=req.body; await m.save(); res.json({success:true, member:m});
});
app.delete('/api/members/:id', authenticateUser, async (req, res) => {
    const m = await Member.findOne({ id: req.params.id });
    if(!m) return res.status(404).json({message:'Not found'});
    if(req.currentUser.role!=='admin' && req.currentUser.username!==m.owner) return res.status(403).json({message:'Forbidden'});
    await Member.deleteOne({ id: req.params.id }); res.json({success:true});
});

app.get('/api/news', async (req, res) => { res.json(await News.find().sort({ id: -1 })); });
app.post('/api/news', authenticateAdmin, async (req, res) => { await new News({ id: Date.now(), ...req.body }).save(); res.json({ success: true }); });
app.delete('/api/news/:id', authenticateAdmin, async (req, res) => { await News.deleteOne({ id: req.params.id }); res.json({ success: true }); });

app.get('/api/gallery', async (req, res) => { res.json(await Gallery.find()); });
app.post('/api/gallery', authenticateAdmin, async (req, res) => { await new Gallery({ id: Date.now(), url: req.body.url }).save(); res.json({ success: true }); });
app.delete('/api/gallery/:id', authenticateAdmin, async (req, res) => { await Gallery.deleteOne({ id: req.params.id }); res.json({ success: true }); });

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => console.log(`🚀 Server running on http://${HOST}:${PORT}`));
