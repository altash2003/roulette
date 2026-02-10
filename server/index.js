// --- AUTH ROUTES ---

// 1. SIGNUP
app.post('/api/signup', async (req, res) => {
    const { username, password } = req.body;
    console.log(`Attempting signup for: ${username}`); // Debug log

    // Validation
    const regex = /^[a-zA-Z0-9]{5,}$/;
    if (!username || !password) {
        return res.status(400).json({ error: "Missing username or password." });
    }
    if (!regex.test(username)) {
        return res.status(400).json({ error: "Username must be at least 5 letters/numbers." });
    }

    try {
        // Check if user exists
        const userCheck = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: "Username already taken." });
        }

        // Hash & Save
        const hash = await bcrypt.hash(password, 10);
        const newUser = await pool.query(
            "INSERT INTO users (username, password_hash, balance) VALUES ($1, $2, 1000) RETURNING id, username, balance, role",
            [username, hash]
        );
        
        console.log("Signup success:", newUser.rows[0]);
        res.json(newUser.rows[0]);
    } catch (err) {
        console.error("Signup Error:", err);
        res.status(500).json({ error: "Server error during signup." });
    }
});

// 2. LOGIN
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(`Attempting login for: ${username}`);

    try {
        const users = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
        if (users.rows.length === 0) return res.status(401).json({ error: "User not found." });

        const valid = await bcrypt.compare(password, users.rows[0].password_hash);
        if (!valid) return res.status(401).json({ error: "Incorrect password." });

        // Create Token
        const token = jwt.sign(
            { id: users.rows[0].id, username: users.rows[0].username, role: users.rows[0].role }, 
            SECRET, 
            { expiresIn: '24h' }
        );

        res.json({ 
            token, 
            user: { 
                id: users.rows[0].id,
                username: users.rows[0].username, 
                balance: parseFloat(users.rows[0].balance), 
                role: users.rows[0].role 
            } 
        });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: "Server error during login." });
    }
});
