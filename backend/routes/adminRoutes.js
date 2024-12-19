const express = require('express');
const { 
  getAllTeachers, 
  createTeacher, 
  getTeacher, 
  updateTeacher, 
  deleteTeacher, 
  allow, 
  setRole, 
  approveStudent, 
  deleteStudent, 
  loginAdmin 
} = require('../controllers/adminController'); 

const { verifyToken } = require('../controllers/authController');
const router = express.Router();


router
  .route('/')
  .get(verifyToken, getAllTeachers)
  .post(verifyToken, allow('admin'), (req, res, next) => {
    // Inline middleware to set role directly without modifying other fields
    req.body.roles = 'teacher';
    next();
  }, createTeacher);

router.route('/:id').get(getTeacher).patch(updateTeacher).delete(deleteTeacher);
router.route('/rejectStudent/:id').delete(deleteStudent);
router.route('/approvestudent/:id').patch(approveStudent);
router.post('/login', loginAdmin); 


module.exports = router;
