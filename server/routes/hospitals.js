const express = require('express');
const Hospital = require('../models/Hospital');
const { authenticate, authorize } = require('../middleware/auth');
const { findNearestN } = require('../utils/haversine');

const router = express.Router();

// List all hospitals
router.get('/', authenticate, async (req, res) => {
    try {
        const hospitals = await Hospital.find().sort({ name: 1 });
        res.json({ hospitals });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get nearby hospitals for a location
router.get('/nearby', authenticate, async (req, res) => {
    try {
        const { lat, lng, limit } = req.query;
        if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required.' });

        const hospitals = await Hospital.find({ isFull: false });
        const nearest = findNearestN({ lat: parseFloat(lat), lng: parseFloat(lng) }, hospitals, parseInt(limit) || 5);

        res.json({
            hospitals: nearest.map((h) => ({
                ...h.resource.toObject(),
                distance: Math.round(h.distance * 100) / 100,
            })),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update bed count
router.patch('/:id/beds', authenticate, async (req, res) => {
    try {
        const { availableBeds } = req.body;
        const hospital = await Hospital.findByIdAndUpdate(
            req.params.id,
            { availableBeds, isFull: availableBeds <= 0 },
            { new: true }
        );
        if (!hospital) return res.status(404).json({ error: 'Hospital not found.' });

        const io = req.app.get('io');
        if (io) io.emit('hospital:updated', hospital);

        res.json({ hospital });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Toggle hospital full status
router.patch('/:id/toggle-full', authenticate, async (req, res) => {
    try {
        const hospital = await Hospital.findById(req.params.id);
        if (!hospital) return res.status(404).json({ error: 'Hospital not found.' });

        hospital.isFull = !hospital.isFull;
        if (hospital.isFull) hospital.availableBeds = 0;
        await hospital.save();

        const io = req.app.get('io');
        if (io) io.emit('hospital:updated', hospital);

        res.json({ hospital });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admit patient — decrement beds
router.post('/:id/admit', authenticate, async (req, res) => {
    try {
        const hospital = await Hospital.findById(req.params.id);
        if (!hospital) return res.status(404).json({ error: 'Hospital not found.' });

        if (hospital.availableBeds > 0) {
            hospital.availableBeds -= 1;
            if (hospital.availableBeds <= 0) hospital.isFull = true;
            await hospital.save();
        }

        const io = req.app.get('io');
        if (io) io.emit('hospital:updated', hospital);

        res.json({ hospital });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
