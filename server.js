const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

dotenv.config();
const app = express();

app.use(express.json());
app.use(cors());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🔥 Database Connected!"))
    .catch(err => console.error("❌ DB Error:", err.message));

// User Schema with Name
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// Nodemailer Setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS // Use Google App Password
    }
});

// Registration Route
app.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: "All fields required!" });
        
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ error: "Email already exists!" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ success: true, message: "Registration Successful!" });
    } catch (err) {
        res.status(500).json({ error: "Server error during registration" });
    }
});

// Login Route
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "User not found!" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Wrong Password!" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret123', { expiresIn: '30d' });
        
        // লগইন সফল হলে নাম এবং টোকেন দুইটাই পাঠানো হচ্ছে
        res.json({ success: true, token, name: user.name });
    } catch (err) {
        res.status(500).json({ error: "Login failed" });
    }
});

// Payment Route
app.post('/send-payment', async (req, res) => {
    const { name, email, course, price, method, trxid } = req.body;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: `New Enrollment: ${course}`,
        html: `
            <div style="font-family: sans-serif; padding: 20px; border: 2px solid #a855f7; border-radius: 12px;">
                <h2 style="color: #a855f7;">New Payment Received</h2>
                <p><strong>Student Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Course:</strong> ${course}</p>
                <p><strong>Amount:</strong> ${price} BDT</p>
                <p><strong>Method:</strong> ${method}</p>
                <p><strong>Transaction ID:</strong> ${trxid}</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to send email" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
