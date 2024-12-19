const User = require("../models/User");
const AppError = require("../utils/AppError");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const catchAsync = require("../utils/catchAsync");
const util = require('util');

const verifyPassword = async (candidatePassword, userPassword) => {
  return await bcrypt.compare(candidatePassword, userPassword);
};  

const signToken = (id, roles, name, email, admissionStatus) => {
  return jwt.sign({ id, roles, name, email, admissionStatus }, process.env.JWT_KEY, {
    expiresIn: '10hr' 
  });
};

exports.signToken = signToken;

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return next(new AppError('Email and password cannot be blank', 400));
    }

    const user = await User.findOne({ email });
    if (!user || !(verifyPassword(password, user.password))) {
      return next(new AppError('Invalid email or password', 401));
    }

    const token = signToken(user._id, user.roles, user.name, user.email, user.admissionStatus);

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          roles: user.roles,
          email: user.email,
          admissionStatus: user.admissionStatus,
        },
      },
      token,
    });
  } catch (error) {
    return next(new AppError('An error occurred during login', 500));
  }
});



exports.updatePassword = catchAsync(async (req, res, next) => {
  const { password, newPassword, newPasswordConfirm } = req.body; 

  if (!password || !newPassword || !newPasswordConfirm) {
    return next(new AppError('All fields are required', 400));
  }

  const user = await User.findById(req.user.id);

  if (!user || !(await verifyPassword(password, user.password))) {
    return next(new AppError('Current password is incorrect', 401));
  }

  if (newPassword !== newPasswordConfirm) {
    return next(new AppError('Passwords do not match', 400));
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    status: "SUCCESS",
    message: "Password updated successfully"
  });
});

exports.verifyToken = catchAsync(async (req, res, next) => {
  let token = '';

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY); 
    req.user = decoded; 
    // console.log('Decoded Token:', JSON.stringify(decoded, null, 2)); 
    // console.log('Decoded user', JSON.stringify(req.user,null,2));                                                           
    next();
  } catch (error) {
    return next(new AppError('Invalid or expired token', 401));
  }
});
