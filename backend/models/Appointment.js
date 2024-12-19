    const mongoose = require('mongoose');

    const appointmentSchema = new mongoose.Schema({

        sendBy: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        scheduleAt: {
            type: Date,
            required: true
        },
        students: [
            {
                studentId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User"
                },
                approved: {
                    type: Boolean,
                    default: false
                }
            }
        ]
    });

    // Compound unique index to avoid duplicate appointments
    appointmentSchema.index({ sendBy: 1, scheduleAt: 1 }, { unique: true });

    module.exports = mongoose.model('Appointment', appointmentSchema);
