const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        mobile: { type: String, trim: true, default: '' },
        address: { type: String, trim: true, default: '' },
        work: { type: String, trim: true, default: '' },
        password: { type: String, required: true, minlength: 4 },
        role: {
            type: String,
            enum: ['CITIZEN', 'POLICE', 'AMBULANCE', 'HOSPITAL', 'ADMIN'],
            required: true,
        },
        location: {
            lat: { type: Number, default: 0 },
            lng: { type: Number, default: 0 },
        },
        status: {
            type: String,
            enum: ['AVAILABLE', 'BUSY', 'OFFLINE'],
            default: 'AVAILABLE',
        },
    },
    { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
