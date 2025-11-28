// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.DATABASE_URL || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/barracuda_db';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-this';

// Connect DB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err.message));

app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Schemas ---
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, index: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true }, // bcrypt hash
  role: { type: String, default: 'member' },
  regDate: { type: Date, default: Date.now }
});

// Hash password before save if modified
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model('User', UserSchema);

const MemberSchema = new mongoose.Schema({
  name: String,
  role: String,
  owner: String, // username
  links: { discord: String, youtube: String },
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

// --- Helpers / Middleware ---
function signToken(user) {
  return jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'No token' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ success: false, message: 'Admin only' });
}

// --- API ---
// Health
app.get('/api/ping', (req, res) => res.json({ success: true, pong: true }));

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ success: false, message: 'Missing fields' });

    const exists = await User.findOne({ $or: [{ username }, { email }] });
    if (exists) return res.status(400).json({ success: false, message: 'Username or email taken' });

    const user = new User({ username, email, password });
    await user.save();

    const token = signToken(user);
    res.json({ success: true, message: 'Registered', user: { username: user.username, role: user.role }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Login (works for admin stored in DB as well)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Missing fields' });

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = signToken(user);
    res.json({ success: true, user: { username: user.username, role: user.role }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- Members ---
app.get('/api/members', async (req, res) => {
  const items = await Member.find({}).sort({ createdAt: -1 }).lean();
  res.json(items.map(i => ({ id: i._id.toString(), ...i })));
});

app.post('/api/members', authMiddleware, async (req, res) => {
  try {
    const owner = req.user.username;
    const count = await Member.countDocuments({ owner });
    if (count >= 1) return res.status(400).json({ success: false, message: 'Only 1 character allowed per user' });

    const { name, role, links } = req.body;
    const m = new Member({ name, role, owner, links });
    await m.save();
    res.json({ success: true, message: 'Member created', member: { id: m._id.toString(), ...m.toObject() } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.delete('/api/members/:id', authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    const m = await Member.findById(id);
    if (!m) return res.status(404).json({ success: false, message: 'Not found' });
    if (m.owner !== req.user.username && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }
    await Member.deleteOne({ _id: id });
    res.json({ success: true });
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- News (admin only POST/DELETE) ---
app.get('/api/news', async (req, res) => {
  const items = await News.find({}).sort({ createdAt: -1 }).lean();
  res.json(items.map(i => ({ id: i._id.toString(), ...i })));
});
app.post('/api/news', authMiddleware, adminOnly, async (req, res) => {
  const { title, date, summary } = req.body;
  const n = new News({ title, date, summary });
  await n.save();
  res.json({ success: true, news: { id: n._id.toString(), ...n.toObject() } });
});
app.delete('/api/news/:id', authMiddleware, adminOnly, async (req, res) => {
  await News.deleteOne({ _id: req.params.id });
  res.json({ success: true });
});

// --- Gallery (admin) ---
app.get('/api/gallery', async (req, res) => {
  const items = await Gallery.find({}).sort({ createdAt: -1 }).lean();
  res.json(items.map(i => ({ id: i._id.toString(), ...i })));
});
app.post('/api/gallery', authMiddleware, adminOnly, async (req, res) => {
  const { url } = req.body;
  const g = new Gallery({ url });
  await g.save();
  res.json({ success: true, gallery: { id: g._id.toString(), ...g.toObject() } });
});
app.delete('/api/gallery/:id', authMiddleware, adminOnly, async (req, res) => {
  await Gallery.deleteOne({ _id: req.params.id });
  res.json({ success: true });
});

// --- Users listing (admin) ---
app.get('/api/users', authMiddleware, adminOnly, async (req, res) => {
  const users = await User.find({}).sort({ regDate: -1 }).lean();
  res.json(users.map(u => ({ username: u.username, email: u.email, role: u.role })));
});
app.get('/api/users/count', authMiddleware, adminOnly, async (req, res) => {
  const totalUsers = await User.countDocuments({});
  const totalAdmins = await User.countDocuments({ role: 'admin' });
  res.json({ totalUsers, totalAdmins });
});
app.delete('/api/users/:username', authMiddleware, adminOnly, async (req, res) => {
  const username = req.params.username;
  await User.deleteOne({ username });
  await Member.deleteMany({ owner: username });
  res.json({ success: true });
});

// Serve index.html for any non-API route (SPA)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ success: false, message: 'Not found' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
