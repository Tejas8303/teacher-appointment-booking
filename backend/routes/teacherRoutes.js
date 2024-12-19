const { setRole, allow } = require("../controllers/adminController")
const { login, updatePassword, verifyToken } = require("../controllers/authController")
const { createAppointment, deleteAppointment, getAllAppointments, getAllStudents, approveAppointment, dissapproveAppointment, getAllPendingStudents,getApprovedAppointments } = require("../controllers/teacherController")
const express = require('express')
const router = express.Router()

router.route('/').get(getAllStudents);
router.post('/login', login)
router.patch('/updatePassword', verifyToken, updatePassword)
router.route('/getApprovedAppointments').get(verifyToken, allow('admin', 'teacher'), getApprovedAppointments)
router.route('/schedule').get(verifyToken, allow('admin', 'teacher'), getAllAppointments).post(verifyToken, allow('admin', 'teacher'), createAppointment)

router.route('/reschedule/:id').delete(verifyToken,allow('teacher'),deleteAppointment);

router.route('/changeApprovalStatus/:id/:studentId').delete(verifyToken, allow('admin', 'teacher'), dissapproveAppointment).patch(verifyToken,allow('admin','teacher'),approveAppointment)

router.route('/getAllPendingStudents')
    .get(
        verifyToken,
        (req, res, next) => {
            // console.log("Middleware verifyToken completed:", req.user);
            next();
        },
        allow('teacher'),
        (req, res, next) => {
            // console.log("Middleware allow completed:", req.user);
            next();
        },
        getAllPendingStudents
    );

module.exports = router