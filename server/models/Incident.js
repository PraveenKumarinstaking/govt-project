const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
    {
        location: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
            address: { type: String, default: '' },
        },
        accidentType: {
            type: String,
            enum: ['COLLISION', 'ROLLOVER', 'PEDESTRIAN', 'MEDICAL', 'FIRE', 'OTHER'],
            default: 'COLLISION',
        },
        severity: {
            type: String,
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            default: 'MEDIUM',
        },
        status: {
            type: String,
            enum: ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'PATIENT_ADMITTED', 'CLOSED'],
            default: 'NEW',
        },
        reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        assignedPolice: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        assignedAmbulance: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        assignedHospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', default: null },
        patientInfo: {
            condition: { type: String, default: '' },
            notes: { type: String, default: '' },
        },
        caseNotes: { type: String, default: '' },
        witnesses: { type: String, default: '' },
        evidenceCollected: { type: String, default: '' },
        timeline: [
            {
                status: String,
                timestamp: { type: Date, default: Date.now },
                updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                note: { type: String, default: '' },
            },
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model('Incident', incidentSchema);
