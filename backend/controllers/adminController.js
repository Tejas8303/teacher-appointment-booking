const User = require("../models/User");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { connect } = require("../utils/sendEmail");
const transporter = connect();
const Appointment = require("../models/Appointment");
const Message = require("../models/Message");
const jwt = require('jsonwebtoken'); 

exports.setRole = function (roles) {
  return (req, res, next) => {
    // console.log('Before setRole:', JSON.stringify(req.body));
    req.body.roles = roles;
    // console.log('After setRole:', JSON.stringify(req.body));
    next();
  };
};

exports.allowforstudent =(...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.roles; 
    if (!userRole || !roles.includes(userRole)) {
      // console.log(`Unauthorized! User roles: ${userRole}`);
      return res.status(403).json({ message: "You do not have permission to perform this action" });
    }

    // console.log(`Authorized user with roles: ${userRole}`);
    next();
  };
}

exports.allow = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.roles; 
    if (!userRole || !roles.includes(userRole)) {
      // console.log(`Unauthorized! User roles: ${userRole}`);
      return res.status(403).json({ message: "You do not have permission to perform this action" });
    }

    // console.log(`Authorized user with roles: ${userRole}`);
    next();
  };
};


const oneTimePasswordCreator = () => {
  let password = crypto.randomBytes(32).toString("hex");
  return password;
};    

const filterObj = (obj) => {
  const newObj = {};
  const notAllowed = ["email", "roles"];
  Object.keys(obj).forEach((el) => {
    if (!notAllowed.includes(el)) {
      newObj[el] = obj[el];
    }
  });
  return newObj;
};


exports.createTeacher = catchAsync(async (req, res, next) => {

  // console.log('User Role:', req.user?.roles); 
  // console.log('Request User:', JSON.stringify(req.user, null, 2)); 
  try {
    const { email, name, department, subject, age, password, passwordConfirm } = req.body;

    if (!email || !name || !department || !age || !password || !passwordConfirm) {
      return res.status(400).json({
        status: "FAIL",
        message: "All fields are required",
      });
    }

    if (password !== passwordConfirm) {
      return res.status(400).json({
        status: "FAIL",
        message: "Passwords do not match",
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        status: "FAIL",
        message: "Email already in use",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await User.create({
      email,
      name,
      department,
      subject,
      age,
      password: hashedPassword,
      roles: "teacher", 
    });

    // Respond with success
    res.status(201).json({
      status: "SUCCESS",
      message: "Teacher added successfully!",
      data: newUser,
    });
  } catch (error) {
    console.error('Error creating teacher:', error);
    res.status(500).json({
      status: "FAIL",
      message: "Internal Server Error",
      error: error.message,
    });
  }
});





exports.getAllTeachers = catchAsync(async (req, res, next) => {
  const users = await User.find({ roles: "teacher" }).populate("appointments");

  res.status(200).json({
    status: "SUCCESS",
    data: {
      users,
    },
  });
});

exports.getTeacher = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  res.status(200).json({
    status: "SUCCESS",
    data: {
      user,
    },
  });
});

exports.updateTeacher = catchAsync(async (req, res, next) => {
  const updateObj = filterObj(req.body);
  const user = await User.findByIdAndUpdate(req.params.id, updateObj, {
    new: true,
  });

  res.status(200).json({
    status: "SUCCESS",
    data: {
      user,
    },
  });
});

exports.deleteTeacher = catchAsync(async (req, res, next) => {
  const userId = req.params.id;


  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      status: "FAIL",
      message: "User not found",
    });
  }

  // Delete the user
  await User.findByIdAndDelete(userId);

  // Delete appointments associated with the user
  await Appointment.deleteMany({ sendBy: user.email });

  // Delete messages associated with the user
  await Message.deleteMany({ $or: [{ from: user.email }, { to: user.email }] });

  res.status(200).json({
    status: "SUCCESS",
    message: "User, related appointments, and messages deleted",
  });
});

exports.approveStudent = catchAsync(async (req, res, next) => {
  const student = await User.findById(req.params.id);

  if (!student) {
    return next(new AppError('Student not found', 404));
  }

  if (student.roles !== 'student') {
    return next(new AppError('User is not a student', 400));
  }

  if (student.admissionStatus) {
    return next(new AppError('Student is already approved', 400));
  }

  // Approve student
  student.admissionStatus = true;
  await student.save();

  // Send approval email
  try {
    await transporter.sendMail({
      from: '"Tutor-Time" <tutor-time@brevo.com>',
      to: student.email,
      subject: 'Account Approved on Tutor-Time',
      html: `
        <h2>Congratulations!</h2>
        <p>Your account on <strong>Tutor-Time</strong> has been approved!</p>
        <p>You can now access all the features available to students.</p>
        <p>Best regards,</p>
        <p>The Tutor-Time Team</p>
      `,
    });
  } catch (error) {
    console.error('Email sending failed:', error);
    return next(new AppError('Approval email could not be sent', 500));
  }

  // Fetch updated list of students
  const students = await User.find({ roles: 'student' }).select('-password');

  res.status(200).json({
    status: 'SUCCESS',
    message: 'Student approved and email sent',
    data: { students },
  });
});

exports.deleteStudent = catchAsync(async (req, res, next) => {
  await User.findByIdAndDelete(req.params.id);

  res.status(200).json({
    status: "SUCCESS",
    message: "Student deleted",
  });
});


exports.loginAdmin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  try {
    if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ email, roles: "admin" }, process.env.JWT_KEY, {
      expiresIn: "10h",
    });

    res.status(200).json({
      token,
      message: "Admin login successful",
      data: {
        user: {
          email,
          roles: "admin", 
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    next(new AppError("Internal server error", 500));
  }
});
