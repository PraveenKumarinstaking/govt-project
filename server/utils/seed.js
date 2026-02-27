/**
 * Seed script — populates demo data for HAERMS
 * Run: node utils/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Hospital = require('../models/Hospital');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/haerms';

// Demo users — locations around Chennai, Tamil Nadu
const demoUsers = [
    // Citizens
    { name: 'Citizen Demo', email: 'citizen@demo.com', password: '1234', role: 'CITIZEN', location: { lat: 13.0827, lng: 80.2707 }, status: 'AVAILABLE' },
    // Police
    { name: 'Patrol Unit Alpha', email: 'police1@demo.com', password: '1234', role: 'POLICE', location: { lat: 13.0600, lng: 80.2500 }, status: 'AVAILABLE' },
    { name: 'Patrol Unit Bravo', email: 'police2@demo.com', password: '1234', role: 'POLICE', location: { lat: 13.1000, lng: 80.2900 }, status: 'AVAILABLE' },
    { name: 'Patrol Unit Charlie', email: 'police3@demo.com', password: '1234', role: 'POLICE', location: { lat: 12.9800, lng: 80.2200 }, status: 'AVAILABLE' },
    // Ambulance
    { name: 'Ambulance Unit 1', email: 'ambulance1@demo.com', password: '1234', role: 'AMBULANCE', location: { lat: 13.0500, lng: 80.2600 }, status: 'AVAILABLE' },
    { name: 'Ambulance Unit 2', email: 'ambulance2@demo.com', password: '1234', role: 'AMBULANCE', location: { lat: 13.0900, lng: 80.2800 }, status: 'AVAILABLE' },
    // Hospital staff
    { name: 'Dr. Priya - GH Staff', email: 'hospital@demo.com', password: '1234', role: 'HOSPITAL', location: { lat: 13.0780, lng: 80.2750 }, status: 'AVAILABLE' },
    // Admin
    { name: 'Administrator', email: 'admin@demo.com', password: '1234', role: 'ADMIN', location: { lat: 13.0827, lng: 80.2707 }, status: 'AVAILABLE' },
];

// Demo hospitals around Chennai
const demoHospitals = [
    {
        name: 'Government General Hospital',
        location: { lat: 13.0780, lng: 80.2750 },
        address: 'Park Town, Chennai',
        phone: '044-25305000',
        availableBeds: 15,
        totalBeds: 30,
        specialties: ['Trauma', 'Emergency', 'Surgery'],
    },
    {
        name: 'Rajiv Gandhi Government Hospital',
        location: { lat: 13.0850, lng: 80.2680 },
        address: 'EVR Periyar Salai, Chennai',
        phone: '044-25305050',
        availableBeds: 10,
        totalBeds: 25,
        specialties: ['Trauma', 'Orthopedics', 'Cardiology'],
    },
    {
        name: 'Stanley Medical College Hospital',
        location: { lat: 13.1150, lng: 80.2870 },
        address: 'Old Jail Road, Royapuram, Chennai',
        phone: '044-25281665',
        availableBeds: 8,
        totalBeds: 20,
        specialties: ['Emergency', 'Neurology', 'Pediatrics'],
    },
];

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        await User.deleteMany({});
        await Hospital.deleteMany({});
        console.log('🗑️  Cleared existing data');

        // Insert users
        for (const userData of demoUsers) {
            const user = new User(userData);
            await user.save();
            console.log(`👤 Created: ${user.name} (${user.role}) — ${user.email}`);
        }

        // Insert hospitals
        for (const hospitalData of demoHospitals) {
            const hospital = new Hospital(hospitalData);
            await hospital.save();
            console.log(`🏥 Created: ${hospital.name}`);
        }

        console.log('\n✅ Seed complete! Demo credentials:');
        console.log('   Citizen:   citizen@demo.com / 1234');
        console.log('   Police:    police1@demo.com / 1234');
        console.log('   Ambulance: ambulance1@demo.com / 1234');
        console.log('   Hospital:  hospital@demo.com / 1234');
        console.log('   Admin:     admin@demo.com / 1234');

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed error:', err.message);
        process.exit(1);
    }
}

seed();
