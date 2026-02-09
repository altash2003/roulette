require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const SECRET = process.env.JWT_SECRET || 'railway-secret-key';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/dist')));

// AUTH MIDDLEWARE
const authenticate = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// ROUTES
app.post('/api/signup', async (req, res) => {
    const { username, password } = req.body;
    const regex = /^[a-zA-Z0-9]{5,}$/;
    if (!regex.test(username) || !regex.test(password)) {
        return res.status(400).json({ error: "Username & Password must be min 5 chars (Letters/Numbers only)." });
    }
    try {
        const hash = await bcrypt.hash(password, 10);
        const newUser = await pool.query(
            "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, balance, role",
            [username, hash]
        );
        res.json(newUser.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Username taken." });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const users = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
        if (users.rows.length === 0) return res.status(401).json({ error: "User not found" });

        const valid = await bcrypt.compare(password, users.rows[0].password_hash);
        if (!valid) return res.status(401).json({ error: "Invalid password" });

        const token = jwt.sign({ id: users.rows[0].id, role: users.rows[0].role }, SECRET);
        res.json({ token, user: { username, balance: users.rows[0].balance, role: users.rows[0].role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/users', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const users = await pool.query("SELECT id, username, balance, role FROM users ORDER BY id");
    res.json(users.rows);
});

app.post('/api/admin/credit', authenticate, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { userId, amount, type } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await client.query("SELECT balance FROM users WHERE id = $1", [userId]);
        let newBal = parseFloat(user.rows[0].balance);
        let adj = parseFloat(amount);
        if (type === 'deposit') newBal += adj; else newBal -= adj;
        await client.query("UPDATE users SET balance = $1 WHERE id = $2", [newBal, userId]);
        await client.query("INSERT INTO transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)", 
            [userId, type, adj, `Admin ${type}`]);
        await client.query('COMMIT');
        res.json({ success: true, newBal });
    } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); } 
    finally { client.release(); }
});

io.on('connection', (socket) => {
    socket.on('message', (data) => io.emit('message', data));
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../client/dist/index.html')));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));