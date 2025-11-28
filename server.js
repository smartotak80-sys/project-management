const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Отримуємо URL бази даних з налаштувань Railway або використовуємо локальний для тестів
const MONGO_URI = process.env.MONGODB_URI || "mongodb://mongo:eObbUKaDoasbzeesJiSMDdeCegvUPTHW@mongodb.railway.internal:27017";

// Підключення до MongoDB з виправленням помилок індексів
mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log("✅ MongoDB успішно підключено");
        
        // --- ВИПРАВЛЕННЯ ПОМИЛКИ E11000 (Duplicate Key) ---
        try {
            // Намагаємося видалити старий індекс 'id_1' з колекції galleries, якщо він там застряг
            await mongoose.connection.db.collection('galleries').dropIndex('id_1');
            console.log("🔧 Проблемний індекс 'id_1' успішно видалено.");
        } catch (e) {
            // Якщо індексу немає, це добре, ігноруємо помилку
        }
    })
    .catch(err => console.error("❌ Помилка підключення до MongoDB:", err));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// --- СХЕМИ БАЗИ ДАНИХ ---

// Користувачі
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    password: { type: String, required: true }, 
    role: { type: String, default: 'member' },
    regDate: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// Учасники сім'ї
const MemberSchema = new mongoose.Schema({
    name: String,
    role: String,
    owner: String, 
    links: {
        discord: String,
        youtube: String,
        tg: String
    },
    createdAt: { type: Date, default: Date.now }
});
const Member = mongoose.model('Member', MemberSchema);

// Новини
const NewsSchema = new mongoose.Schema({
    title: String,
    date: String,
    summary: String,
    createdAt: { type: Date, default: Date.now }
});
const News = mongoose.model('News', NewsSchema);

// Галерея
const GallerySchema = new mongoose.Schema({
    url: String,
    createdAt: { type: Date, default: Date.now }
});
const Gallery = mongoose.model('Gallery', GallerySchema);

// --- API ЗАПИТИ ---

// 1. АВТОРИЗАЦІЯ
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) return res.status(400).json({ success: false, message: 'Вже існує' });

        const newUser = new User({ username, email, password, role: 'member' });
        await newUser.save();
        res.json({ success: true, message: 'Реєстрація успішна' });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    // Адмінський бекдор (про запас)
    if(username === 'famillybarracuda@gmail.com' && password === 'barracuda123') {
         return res.json({ success: true, user: { username: 'ADMIN 🦈', role: 'admin' } });
    }
    try {
        const user = await User.findOne({ username, password });
        if (user) res.json({ success: true, user: { username: user.username, role: user.role } });
        else res.status(401).json({ success: false, message: 'Невірні дані' });
    } catch (err) { res.status(500).json({ success: false }); }
});

// 2. УЧАСНИКИ
app.get('/api/members', async (req, res) => {
    const members = await Member.find().sort({ createdAt: -1 });
    res.json(members.map(m => ({ ...m._doc, id: m._id })));
});
app.post('/api/members', async (req, res) => {
    try { await new Member(req.body).save(); res.json({ success: true }); } 
    catch(e) { res.status(500).json({error: e.message}); }
});
app.put('/api/members/:id', async (req, res) => {
    await Member.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
});
app.delete('/api/members/:id', async (req, res) => {
    await Member.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// 3. НОВИНИ
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

// 4. ГАЛЕРЕЯ
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

// 5. АДМІНКА
app.get('/api/users', async (req, res) => {
    const users = await User.find().sort({ regDate: -1 });
    res.json(users);
});
app.delete('/api/users/:username', async (req, res) => {
    await User.findOneAndDelete({ username: req.params.username });
    await Member.deleteMany({ owner: req.params.username });
    res.json({ success: true });
});
app.get('/api/users/count', async (req, res) => {
    const total = await User.countDocuments();
    const admins = await User.countDocuments({ role: 'admin' });
    res.json({ totalUsers: total, totalAdmins: admins, maxUsers: 50 });
});

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
