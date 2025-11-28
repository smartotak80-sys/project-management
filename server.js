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
    .then(() => console.log("✅ БАЗА ДАНИХ ПІДКЛЮЧЕНА"))
    .catch(err => console.error("❌ ПОМИЛКА БД:", err.message));

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// --- СХЕМИ ---
const UserSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    role: { type: String, default: 'member' },
    regDate: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const MemberSchema = new mongoose.Schema({
    name: String,
    role: String,
    owner: String,
    links: { discord: String, youtube: String },
    createdAt: { type: Date, default: Date.now }
});
const Member = mongoose.model('Member', MemberSchema);

// --- API ---

// РЕЄСТРАЦІЯ
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;

    const exists = await User.findOne({ $or: [{ username }, { email }] });

    if (exists) {
        return res.json({ success: false, message: "Логін або Email вже зайнятий" });
    }

    await new User({ username, email, password }).save();
    res.json({ success: true, message: "Реєстрація успішна" });
});

// ЛОГІН (адмін хардкод)
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    if (username === "famillybarracuda@gmail.com" && password === "barracuda123") {
        return res.json({ success: true, user: { username: "ADMIN", role: "admin" } });
    }

    const user = await User.findOne({ username, password });

    if (!user) {
        return res.json({ success: false, message: "Невірні дані" });
    }

    res.json({ success: true, user });
});

// СТВОРЕННЯ ПЕРСОНАЖА
app.post("/api/create-character", async (req, res) => {
    const { name, rank, discord, youtube, owner } = req.body;

    const count = await Member.countDocuments({ owner });

    if (count >= 1) {
        return res.json({ success: false, message: "Ви можете створити тільки 1 персонажа" });
    }

    await new Member({
        name,
        role: rank,
        owner,
        links: { discord, youtube }
    }).save();

    res.json({ success: true, message: "Персонажа успішно створено!" });
});

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "register.html"));
});

app.listen(PORT, () => console.log(`🚀 Сервер запущено на порту ${PORT}`));
