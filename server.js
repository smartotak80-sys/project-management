const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

// Підключення до MongoDB (Використовуйте вашу змінну з Railway або рядок підключення)
const MONGO_URI = process.env.MONGO_URL || "mongodb://mongo:eObbUKaDoasbzeesJiSMDdeCegvUPTHW@mongodb.railway.internal:27017"; 

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Error:", err));

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// --- SCHEMAS (Схеми даних) ---

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // У реальному проекті варто хешувати паролі!
    email: { type: String },
    role: { type: String, default: 'member' },
    regDate: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const MemberSchema = new mongoose.Schema({
    name: String,
    role: String,
    owner: String, // Хто створив запис
    links: {
        discord: String,
        youtube: String,
        tg: String
    },
    createdAt: { type: Date, default: Date.now }
});
const Member = mongoose.model('Member', MemberSchema);

const NewsSchema = new mongoose.Schema({
    title: String,
    date: String,
    summary: String,
    createdAt: { type: Date, default: Date.now }
});
const News = mongoose.model('News', NewsSchema);

const GallerySchema = new mongoose.Schema({
    url: String,
    createdAt: { type: Date, default: Date.now }
});
const Gallery = mongoose.model('Gallery', GallerySchema);

// --- API ROUTES ---

// 1. AUTH
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;
        // Перевірка ліміту користувачів (якщо треба)
        // const count = await User.countDocuments({ role: { $ne: 'admin' } });
        // if (count >= 1) return res.status(403).json({ success: false, message: 'Ліміт реєстрацій вичерпано' });

        const newUser = new User({ username, password, email, role: 'member' });
        await newUser.save();
        res.json({ success: true, message: 'Користувача створено' });
    } catch (err) {
        res.status(400).json({ success: false, message: 'Помилка реєстрації (логін зайнятий?)' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    // Адмін хардкод (або додайте його в БД вручну)
    if(username === 'famillybarracuda@gmail.com' && password === 'barracuda123') {
         return res.json({ success: true, user: { username: 'ADMIN 🦈', role: 'admin' } });
    }

    const user = await User.findOne({ username, password });
    if (user) {
        res.json({ success: true, user: { username: user.username, role: user.role } });
    } else {
        res.status(401).json({ success: false, message: 'Невірні дані' });
    }
});

// 2. MEMBERS
app.get('/api/members', async (req, res) => {
    const members = await Member.find().sort({ createdAt: -1 });
    // Перетворюємо _id в id для фронтенду
    res.json(members.map(m => ({ ...m._doc, id: m._id })));
});

app.post('/api/members', async (req, res) => {
    try {
        const newMember = new Member(req.body);
        await newMember.save();
        res.json({ success: true });
    } catch(e) { res.status(500).json({error: e.message}); }
});

app.put('/api/members/:id', async (req, res) => {
    await Member.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
});

app.delete('/api/members/:id', async (req, res) => {
    await Member.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// 3. NEWS
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

// 4. GALLERY
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

// 5. USERS (Для адмін панелі)
app.get('/api/users', async (req, res) => {
    const users = await User.find({}, '-password'); // Не віддавати паролі
    res.json(users);
});

app.delete('/api/users/:username', async (req, res) => {
    await User.findOneAndDelete({ username: req.params.username });
    // Також видалити мемберів цього юзера
    await Member.deleteMany({ owner: req.params.username });
    res.json({ success: true });
});

app.get('/api/users/count', async (req, res) => {
    const total = await User.countDocuments();
    const admins = await User.countDocuments({ role: 'admin' });
    res.json({ totalUsers: total, totalAdmins: admins, maxUsers: 1 }); // maxUsers можна змінити
});

// Serve Frontend
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
