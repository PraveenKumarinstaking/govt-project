const express = require('express');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// List users by role
router.get('/', authenticate, async (req, res) => {
    try {
        const filter = {};
        if (req.query.role) filter.role = req.query.role;
        if (req.query.status) filter.status = req.query.status;

        const users = await User.find(filter).select('-password').sort({ name: 1 });
        res.json({ users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create staff (Admin only)
router.post('/', authenticate, authorize(['ADMIN']), async (req, res) => {
    try {
        const { name, email, password, role, mobile } = req.body;

        // Prevent admin creation or citizen creation through this route for safety
        if (!['POLICE', 'AMBULANCE', 'HOSPITAL'].includes(role)) {
            return res.status(400).json({ error: 'Invalid staff role.' });
        }

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ error: 'Email already registered.' });
        }

        const user = new User({ name, email, password, role, mobile });
        await user.save();

        const data = await User.findById(user._id).select('-password');
        res.status(201).json({ user: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update staff (Admin only)
router.patch('/:id', authenticate, authorize(['ADMIN']), async (req, res) => {
    try {
        const { name, email, role, mobile } = req.body;
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (email !== undefined) updates.email = email;
        if (mobile !== undefined) updates.mobile = mobile;

        if (role !== undefined) {
            if (!['POLICE', 'AMBULANCE', 'HOSPITAL'].includes(role)) {
                return res.status(400).json({ error: 'Invalid staff role.' });
            }
            updates.role = role;
        }

        const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found.' });

        // Emit update via socket
        const io = req.app.get('io');
        if (io) io.emit('user:statusUpdate', { userId: user._id, status: user.status, role: user.role });

        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update own status
router.patch('/status', authenticate, async (req, res) => {
    try {
        const { status } = req.body;
        const user = await User.findByIdAndUpdate(req.user._id, { status }, { new: true }).select('-password');

        const io = req.app.get('io');
        if (io) io.emit('user:statusUpdate', { userId: user._id, status: user.status, role: user.role });

        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update own location
router.patch('/location', authenticate, async (req, res) => {
    try {
        const { lat, lng } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { location: { lat, lng } },
            { new: true }
        ).select('-password');

        const io = req.app.get('io');
        if (io) io.emit('user:locationUpdate', { userId: user._id, location: user.location, role: user.role });

        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get own profile
router.get('/profile', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found.' });
        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update own profile
router.patch('/profile', authenticate, async (req, res) => {
    try {
        const { name, mobile, address, work } = req.body;
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (mobile !== undefined) updates.mobile = mobile;
        if (address !== undefined) updates.address = address;
        if (work !== undefined) updates.work = work;

        const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
