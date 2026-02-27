const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { name, email, mobile, address, work, password, role } = req.body;

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ error: 'Email already registered.' });
        }

        const user = new User({ name, email, mobile, address, work, password, role: role || 'CITIZEN' });
        await user.save();

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '24h',
        });

        res.status(201).json({
            token,
            user: { id: user._id, name: user.name, email: user.email, mobile: user.mobile, address: user.address, work: user.work, role: user.role },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '24h',
        });

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                address: user.address,
                work: user.work,
                role: user.role,
                status: user.status,
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get current user
router.get('/me', require('../middleware/auth').authenticate, async (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;
