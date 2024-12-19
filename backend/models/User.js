const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const AppError = require('../utils/AppError');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, "Email field is required"],
        unique: true,
    },
    name: {
        type: String,
        required: [true, "Name field is required"],
    },
    department: {
        type: String,
        required: [true, "Department field is required"],
    },
    subject: {
        type: Array,
        default: [],
    },
    age: {
        type: Number,
        required: true,
    },
    roles: {
        type: String,
        required: true,
        default: "student",
    },
    password: {
        type: String,
        required: true,
    },
    passwordConfirm: {
        type: String,
        validate: {
            validator: function (el) {
                return el === this.password;
            },
            message: 'Passwords do not match!',
        },
        select: false,
    },
    appointments: [
        {
            type: mongoose.Schema.ObjectId,
            ref: "Appointment",
        },
    ],
    admissionStatus: {
        type: Boolean,
        default: false,
    },
});

// Pre-save hook for hashing password
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    this.password = await bcrypt.hash(this.password, 10);
    this.passwordConfirm = undefined; 
    next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
