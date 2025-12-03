const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const db = require('./Config/db'); // Database connection
const adminControllers = require('./Controllers/admincontrollers');
const studentControllers = require('./Controllers/studentcontrollers');

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Multer setup for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Make sure this folder exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // e.g., 167235845.xlsx
  },
});

const upload = multer({ storage: storage });


// Admin Routes
app.post('/api/admin/register', adminControllers.register);
app.post('/api/admin/login', adminControllers.login);
app.post('/api/admin/forgot-password', adminControllers.forgotPassword);
app.post('/api/admin/reset-password', adminControllers.resetPassword);

app.post('/api/admin/students', adminControllers.checkAllStudents);

app.delete('/api/admin/delete-student/:studentId', adminControllers.deleteStudent);
// app.get('/api/admin/student/:studentId', adminControllers.fetchStudent);
// app.put('/api/admin/edit-student/:studentId', adminControllers.updateStudent);
app.post('/api/admin/student/:studentId', adminControllers.getStudentById);
app.put('/api/admin/student/:studentId', adminControllers.updateStudentById);

app.post('/api/admin/add-student', adminControllers.createStudent);
app.post('/api/admin/import-students', upload.single('file'), adminControllers.importStudents);




app.get('/api/admin/candidates', adminControllers.getAllCandidates);
app.delete('/api/admin/delete-candidates/:candidateId', adminControllers.deleteCandidate);
// app.get('/api/admin/student/:studentId', adminControllers.fetchStudent);
// app.put('/api/admin/edit-student/:studentId', adminControllers.updateStudent);
app.post('/api/admin/candidate/:candidateId', adminControllers.getCandidateById);
app.put('/api/admin/candidate/:candidateId', adminControllers.updateCandidateById);

app.post('/api/admin/add-candidate', adminControllers.addCandidate);
app.post('/api/admin/import-candidates', upload.single('file'), adminControllers.importCandidates);

app.get('/api/admin/vote-results', adminControllers.getVoteResults);
app.post('/api/admin/vote-results', adminControllers.getVoteResults);
// app.get("/api/student/getCandidates", studentControllers.getCandidatesByGenderAndDesignation);

// Get all candidates
app.get("/api/student/getCandidates", studentControllers.getCandidatesByDesignationAndHouse);

// Cast vote
app.post("/api/student/castVote", studentControllers.castVote);

//Student Routes
app.post('/api/student/login', studentControllers.login);
app.post('/api/student/forgot-password', studentControllers.forgotPassword);
app.post('/api/student/reset-password', studentControllers.resetPassword);
app.post('/api/student/editProfile/', studentControllers.EditProfile);

// Start server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
