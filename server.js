require('dotenv').config(); 
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/barracuda_db";

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log("✅ БАЗА ДАНИХ ПІДКЛЮЧЕНА (MongoDB)");
        // Очистка старих індексів, щоб уникнути помилок
        try { await mongoose.connection.db.collection('galleries').dropIndex('id_1'); } catch (e) {}
    })
    .catch(err => console.error("❌ ПОМИЛКА ПІДКЛЮЧЕННЯ ДО БД:", err.message));

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// --- СХЕМИ ---
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    password: { type: String, required: true }, 
    role: { type: String, default: 'member' },
    regDate: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const MemberSchema = new mongoose.Schema({
    name: String, role: String, owner: String, 
    links: { discord: String, youtube: String, tg: String },
    createdAt: { type: Date, default: Date.now }
});
const Member = mongoose.model('Member', MemberSchema);

const NewsSchema = new mongoose.Schema({ title: String, date: String, summary: String, createdAt: { type: Date, default: Date.now } });
const News = mongoose.model('News', NewsSchema);

const GallerySchema = new mongoose.Schema({ url: String, createdAt: { type: Date, default: Date.now } });
const Gallery = mongoose.model('Gallery', GallerySchema);

// --- API ---

// 1. АВТОРИЗАЦІЯ
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) return res.status(400).json({ success: false, message: 'Такий користувач вже існує' });
        await new User({ username, email, password, role: 'member' }).save();
        res.json({ success: true, message: 'Реєстрація успішна' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    // Адмін-бекдор (на всяк випадок)
    if(username === 'famillybarracuda@gmail.com' && password === 'barracuda123') {
         return res.json({ success: true, user: { username: 'ADMIN 🦈', role: 'admin' } });
    }
    try {
        const user = await User.findOne({ username, password });
        if (user) res.json({ success: true, user: { username: user.username, role: user.role } });
        else res.status(401).json({ success: false, message: 'Невірний логін або пароль' });
    } catch (err) { res.status(500).json({ success: false }); }
});

// 2. УЧАСНИКИ (З ЛІМІТАМИ)
app.get('/api/members', async (req, res) => {
    const members = await Member.find().sort({ createdAt: -1 });
    res.json(members.map(m => ({ ...m._doc, id: m._id })));
});

app.post('/api/members', async (req, res) => {
    try {
        const ownerName = req.body.owner;
        const currentUser = await User.findOne({ username: ownerName });
        
        // --- ГОЛОВНА ПЕРЕВІРКА ЛІМІТУ ---
        if (currentUser && currentUser.role !== 'admin') {
            const count = await Member.countDocuments({ owner: ownerName });
            if (count >= 1) {
                return res.status(403).json({ success: false, message: 'ЛІМІТ: Ви можете створити лише 1 картку учасника.' });
            }
        }
        // --------------------------------

        await new Member(req.body).save(); 
        res.json({ success: true }); 
    } catch(e) { res.status(500).json({ success: false, error: e.message }); }
});

app.put('/api/members/:id', async (req, res) => { await Member.findByIdAndUpdate(req.params.id, req.body); res.json({ success: true }); });
app.delete('/api/members/:id', async (req, res) => { await Member.findByIdAndDelete(req.params.id); res.json({ success: true }); });

// 3. НОВИНИ & ГАЛЕРЕЯ
app.get('/api/news', async (req, res) => { const news = await News.find().sort({ createdAt: -1 }); res.json(news.map(n => ({ ...n._doc, id: n._id }))); });
app.post('/api/news', async (req, res) => { await new News(req.body).save(); res.json({ success: true }); });
app.delete('/api/news/:id', async (req, res) => { await News.findByIdAndDelete(req.params.id); res.json({ success: true }); });

app.get('/api/gallery', async (req, res) => { const gallery = await Gallery.find().sort({ createdAt: -1 }); res.json(gallery.map(g => ({ ...g._doc, id: g._id }))); });
app.post('/api/gallery', async (req, res) => { await new Gallery(req.body).save(); res.json({ success: true }); });
app.delete('/api/gallery/:id', async (req, res) => { await Gallery.findByIdAndDelete(req.params.id); res.json({ success: true }); });

// 4. АДМІНКА
app.get('/api/users', async (req, res) => { const users = await User.find().sort({ regDate: -1 }); res.json(users); });
app.delete('/api/users/:username', async (req, res) => {
    try {
        await User.findOneAndDelete({ username: req.params.username });
        await Member.deleteMany({ owner: req.params.username });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});
app.get('/api/users/count', async (req, res) => {
    const total = await User.countDocuments();
    res.json({ totalUsers: total });
});

app.get("*", (req, res) => { res.sendFile(path.join(__dirname, "public", "index.html")); });
app.listen(PORT, () => { console.log(`🚀 Сервер запущено на порту ${PORT}`); });
