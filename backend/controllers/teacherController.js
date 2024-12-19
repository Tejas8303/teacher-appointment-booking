
const User = require("../models/User");
const Appointment = require("../models/Appointment");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { connect } = require('../utils/sendEmail');
const transporter = connect()

// Helper function to check if two appointment times clash
const checkTimeClash = (time1, time2) => {
    const timeDiff = Math.abs(new Date(time1) - new Date(time2));
    return timeDiff <= 7200000; // 120 minutes in milliseconds
};

// Helper function to retrieve appointments for a user within a specific date range
const getUserAppointments = async (email, startDate, endDate) => {
    return await Appointment.find({
        sendBy: email,

        scheduleAt: { $gte: startDate, $lt: endDate }
    });
};

exports.getAllPendingStudents = catchAsync(async (req, res, next) => {
    if (!req.user || !req.user.email) {
        return next(new AppError("User not authorized or email missing in token.", 401));
    }

    try {
        // Fetch appointments where the sender is the current user
        const appointments = await Appointment.find({
            sendBy: req.user.email,
            "students.approved": false 
        }).select("name scheduleAt students");

        // Filter unapproved students for each appointment
        const filteredAppointments = appointments.map(appointment => {
            const unapprovedStudents = appointment.students.filter(student => !student.approved);
            return {
                _id: appointment._id,
                name: appointment.name,
                scheduleAt: appointment.scheduleAt,
                students: unapprovedStudents
            };
        });

        // Populate student details for unapproved students only
        for (let appointment of filteredAppointments) {
            for (let student of appointment.students) {
                student.studentId = await User.findById(student.studentId).select("_id name department email");
            }
        }

        res.status(200).json({
            status: "Success",
            students: filteredAppointments
        });
    } catch (error) {
        console.error("Error fetching pending students:", error);
        next(new AppError("Unable to fetch pending students", 500));
    }
});


exports.getAllAppointments = catchAsync(async (req, res) => {
    const appointments = await Appointment.find({ sendBy: req.user.email });
    res.status(200).json({ appointments });
});




exports.createAppointment = catchAsync(async (req, res, next) => {
    // console.log('Request User:', req.user);
    // console.log('Schedule At:', req.body.scheduleAt);

    const sendBy = req.user.email;
    const name = req.user.name;
    const scheduleAt = req.body.scheduleAt;

    const newAppointment = await Appointment.create({ sendBy, name, scheduleAt });
    console.log('New Appointment:', newAppointment);

    await User.findOneAndUpdate(
        { _id: req.user.id },
        { $push: { appointments: newAppointment._id } }
    );

    res.status(200).json({
        newAppointment
    });
});


exports.approveAppointment = catchAsync(async (req, res) => {
    const appointment = await Appointment.findOneAndUpdate({ _id: req.params.id, "students.studentId": req.params.studentId }, {
        $set: {
            'students.$.approved': true 
        }
    });

    const studentEmail = await User.findById(req.params.studentId).select('email');
    // console.log(studentEmail)
    let info = await transporter.sendMail({
        from: '"tutor-time@brevo.com',
        to: studentEmail.email,
        subject: "Appointment Accepted",
        html: `
            <h2>Dear Student,</h2>
            <p>We are pleased to inform you that your appointment request has been successfully accepted by the teacher.</p>
            <p>Please make sure to join the session on time. If you have any questions or concerns, feel free to contact us.</p>
            <p>Thank you for using Tutor-Time, and we hope you have a productive session!</p>
            <p>Best regards,</p>
            <p>Tutor-Time</p>
            <p>Visit our website</p>

    `,
    });

    res.status(200).json({ message: "Approved" });
});

exports.dissapproveAppointment = catchAsync(async (req, res) => {
    const appointment = await Appointment.findOneAndUpdate({ _id: req.params.id }, {
        $pull: {
            'students': { 'studentId': req.params.studentId }
        }
    });
    
    

    const studentEmail = await User.findById(req.params.studentId).select('email');
    // console.log(studentEmail)
    let info = await transporter.sendMail({
        from: "abutalhasheikh33@gmail.com",
        to: studentEmail.email,
        subject: "Appointment Rejected",
        html: `
        <h2>Dear Student,</h2>
        <p>We regret to inform you that your appointment request has been rejected by the teacher.</p>
        <p>If you have any questions or concerns, please reach out to us for further assistance.</p>
        <p>Thank you for using Tutor-Time, and we hope you understand the situation.</p>
        <p>Best regards,</p>
        <p>Tutor-Time</p>
        <p>Visit our website</p>

    `,
    });

    res.status(200).json({ message: "Student rejected" });
});

exports.deleteAppointment = catchAsync(async (req, res) => {
    await Appointment.findByIdAndDelete(req.params.id);
    await User.findByIdAndUpdate(req.user.id, { $pull: { 'appointments': req.params.id } })
    const message = `Appointment has been cancelled`;
    //await sendEmail(appointment.sendBy, req.body.mail, "Appointment Booking", message);
    res.status(200).json({ status: "SUCCESS", message: "Appointment deleted" });
});

exports.getAllStudents = catchAsync(async (req, res) => {
    const filter = { roles: "student", ...req.query };
    const students = await User.find(filter).collation({ locale: 'en', strength: 2 });
    res.status(200).json({ students });
});

exports.getApprovedAppointments = catchAsync(async (req, res, next) => {
    try {
        // Fetch appointments where sendBy matches the current user and at least one student is approved
        const appointments = await Appointment.find({
            sendBy: req.user.email,
            "students.approved": true,
        })
            .select("name scheduleAt students") 
            .populate({
                path: "students.studentId",
                select: "name email department", 
            });

        // Filter out only approved students for each appointment
        const approvedAppointments = appointments.map(appointment => {
            const approvedStudents = appointment.students.filter(student => student.approved);
            return {
                _id: appointment._id,
                name: appointment.name,
                scheduleAt: appointment.scheduleAt,
                students: approvedStudents,
            };
        });

        // console.log("Approved Appointments:", approvedAppointments);

        res.status(200).json({
            status: "Success",
            appointments: approvedAppointments,
        });
    } catch (error) {
        console.error("Error fetching approved appointments:", error);
        next(new AppError("Unable to fetch approved appointments", 500));
    }
});
