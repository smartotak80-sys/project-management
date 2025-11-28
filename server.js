// --- Вставте це в server.js після інших схем (NewsSchema, GallerySchema) ---

const TicketSchema = new mongoose.Schema({
    author: String,       // Нік гравця
    title: String,        // Тема
    status: { type: String, default: 'open' }, // open, pending, closed
    messages: [{
        sender: String,   // Хто написав (гравець або адмін)
        text: String,
        date: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now },
    lastUpdate: { type: Date, default: Date.now }
});
const Ticket = mongoose.model('Ticket', TicketSchema);

// --- Вставте це в server.js до блоку маршрутів API ---

// Отримати тікети (адмін бачить всі, гравець - свої)
app.post('/api/tickets/list', async (req, res) => {
    const { username, role } = req.body;
    try {
        let tickets;
        if (role === 'admin') {
            tickets = await Ticket.find().sort({ lastUpdate: -1 });
        } else {
            tickets = await Ticket.find({ author: username }).sort({ lastUpdate: -1 });
        }
        res.json(tickets.map(t => ({ ...t._doc, id: t._id })));
    } catch (e) { res.status(500).json({ success: false }); }
});

// Створити новий тікет
app.post('/api/tickets', async (req, res) => {
    try {
        const { author, title, text } = req.body;
        const newTicket = new Ticket({
            author,
            title,
            messages: [{ sender: author, text }]
        });
        await newTicket.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// Відповісти на тікет або змінити статус
app.put('/api/tickets/:id', async (req, res) => {
    try {
        const { sender, text, status } = req.body;
        const updateData = { lastUpdate: Date.now() };
        
        if (status) updateData.status = status;
        if (text) {
            updateData.$push = { messages: { sender, text } };
        }
        
        await Ticket.findByIdAndUpdate(req.params.id, updateData);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});
