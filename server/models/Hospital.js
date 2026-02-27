const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        location: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
        },
        address: { type: String, default: '' },
        phone: { type: String, default: '' },
        availableBeds: { type: Number, default: 10 },
        totalBeds: { type: Number, default: 20 },
        isFull: { type: Boolean, default: false },
        specialties: [{ type: String }],
    },
    { timestamps: true }
);

module.exports = mongoose.model('Hospital', hospitalSchema);
