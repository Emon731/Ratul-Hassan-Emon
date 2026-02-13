const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();
const app = express();

app.use(express.json());
app.use(cors());


mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🔥 ডাটাবেজ কানেক্ট হয়েছে সফলভাবে!"))
    .catch(err => console.error("❌ ডাটাবেজ এরর:", err.message));

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

app.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ error: "Email already exists!" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: "Registration Successful!" });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "User not found!" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Wrong Password!" });

        const token = jwt.sign(
            { id: user._id }, 
            process.env.JWT_SECRET || 'secret123', 
            { expiresIn: '30d' } 
        );
        res.json({ message: "Login Successful!", token });
    } catch (err) {
        res.status(500).json({ error: "Login failed" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 সার্ভার চলছে পোর্ট ${PORT}-এ`));
