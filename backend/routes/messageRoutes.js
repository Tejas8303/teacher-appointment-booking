const express = require('express');
const { getAllMessages, sendMessage } = require('../controllers/messageController');
const { verifyToken } = require('../controllers/authController');
const { allow, allowforstudent } = require('../controllers/adminController');
const router = express.Router();

router.route('/').get(verifyToken, allow('teacher'), getAllMessages).post(verifyToken, allowforstudent('student'), sendMessage);


module.exports = router;