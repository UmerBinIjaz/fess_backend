const db = require('../Config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Login Student
exports.login = (req, res) => {
    const { reg, password } = req.body;

    // Check if the email exists
    const checkEmailQuery = 'SELECT * FROM student WHERE reg = ?';
    db.query(checkEmailQuery, [reg], (err, results) => {
        if (err) {
            console.error('Error checking reg:', err);
            return res.status(500).json({ error: 'Error checking reg' });
        }

        // If email not found
        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const student = results[0];

        // Compare password
        const passwordMatch = bcrypt.compareSync(password, student.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid reg or password' });
        }

        // Generate JWT token
        const token = jwt.sign({ id: student.id, reg: student.reg }, 'your_jwt_secret', { expiresIn: '1h' });

        res.status(200).json({
            message: 'Login successful',
            token: token,
            student: {
                id: student.id,
                name: student.name,
                email: student.email,
                reg: student.reg,
                class_section: student.class_section
            }
        });
    });
};


// exports.login = (req, res) => {
//     const { email, password } = req.body;
//     const query = 'SELECT * FROM student WHERE email = ?';
    
//     db.query(query, [email], (err, results) => {
//         if (err || results.length === 0) {
//             return res.status(401).json({ error: 'Invalid email or password' });
//         }

//         const student = results[0];
//         const isMatch = bcrypt.compareSync(password, student.password);

//         if (!isMatch) {
//             return res.status(401).json({ error: 'Invalid email or password' });
//         }

//         const token = jwt.sign({ id: student.id, role: 'student' }, 'your_jwt_secret', { expiresIn: '1h' });
//         res.json({ token });
//     });
// };

// Forgot Password
exports.forgotPassword = (req, res) => {
  const { email } = req.body;

  if(!email){
    return res.status(400).json({ error: 'All fields are required' })    
  }

  const query = 'SELECT * FROM student WHERE email = ?';
  db.query(query, [email], (err, results) => {
      if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
      }
      if (results.length === 0) {
          return res.status(404).json({ error: 'Student not found with that email' });
      }

      const student = results[0];
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000).toISOString().slice(0, 19).replace('T', ' '); // Format as YYYY-MM-DD HH:MM:SS

      const updateQuery = 'UPDATE student SET reset_token = ?, reset_token_expiry = ? WHERE email = ?';
      db.query(updateQuery, [resetToken, resetTokenExpiry, email], (err) => {
          if (err) {
              console.error('Error saving reset token:', err);
              return res.status(500).json({ error: 'Error saving reset token' });
          }

          const transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                  user: 'uk302268@gmail.com',
                  pass: 'relt bvns schh qjoh' // Use environment variables for sensitive data
              }
          });

          const resetUrl = `http://localhost:5173/student/reset-password?token=${resetToken}`;
          const mailOptions = {
              from: 'uk302268@gmail.com',
              to: email,
              subject: 'Password Reset Request',
              text: `You requested a password reset. Click the link to reset your password: ${resetUrl}. This link is valid for 1 hour.`
          };

          transporter.sendMail(mailOptions, (err) => {
              if (err) {
                  console.error('Error sending email:', err);
                  return res.status(500).json({ error: 'Error sending email' });
              }
              res.status(200).json({ message: 'Password reset email sent successfully' });
          });
      });
  });
};


// Reset Password
exports.resetPassword = (req, res) => {
  const { token, password } = req.body;

  const query = 'SELECT * FROM student WHERE reset_token = ? AND reset_token_expiry > ?';
  db.query(query, [token, Date.now()], (err, results) => {
      if (err) {
          console.error('Error validating reset token:', err);
          return res.status(500).json({ error: 'Error validating reset token' });
      }
      if (results.length === 0) {
          return res.status(400).json({ error: 'Invalid or expired token' });
      }

      const student = results[0];
      const hashedPassword = bcrypt.hashSync(password, 10);
      const updateQuery = 'UPDATE student SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE email = ?';
      db.query(updateQuery, [hashedPassword, student.email], (err) => {
          if (err) {
              console.error('Error updating password:', err);
              return res.status(500).json({ error: 'Error updating password' });
          }
          res.status(200).json({ message: 'Password reset successfully' });
      });
  });
};


exports.EditProfile = (req, res) => {
  const {studentId, studentEmail, studentPass , studentClassSection} = req.body;

  if (!studentId || !studentEmail || !studentPass || !studentClassSection) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const hashedPassword = bcrypt.hashSync(studentPass, 10);

  
  const checkStudentQuery = 'SELECT id FROM student WHERE id = ?';
  db.query(checkStudentQuery, [studentId], (err, results) => {
      if (err) {
          console.error('Error checking      Student ID:', err.message);
          return res.status(500).json({ error: 'Internal server error' });
      }

      if (results.length === 0) {
          return res.status(404).json({ error: 'Student ID not found' });
      }

      // Step 2: UPDATE STUDENT
      const UpdateStudentInfo = 'UPDATE student SET email = ?, password = ?, studentClassSection = ? WHERE id = ?';
      db.query(UpdateStudentInfo, [studentEmail, hashedPassword, studentClassSection, studentId], (err, results) => {
          if (err) {
              console.error('Error updating Student Info:', err.message);
              return res.status(500).json({ error: 'Internal server error' });
          }
          res.status(201).json({ message: 'Student Info Update Successfully' });
      });
  });
}

exports.getCandidatesByDesignationAndHouse = (req, res) => {
  db.query('SELECT * FROM candidates', (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch candidates.' });
    res.json(results);
  });
};

// Cast vote
exports.castVote = (req, res) => {
  const { studentId, votes } = req.body;
  if (!studentId || !votes) return res.status(400).json({ error: 'Invalid vote data.' });

  // Build insert object dynamically based on house and designation
  const voteData = { student_id: studentId };
  for (const house in votes) {
    for (const designation in votes[house]) {
      const columnName = `${house}_${designation.replace(/\s+/g, '_')}_id`;
      voteData[columnName] = votes[house][designation];
    }
  }

  // Check if student already voted
  db.query('SELECT * FROM votes WHERE student_id = ?', [studentId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length > 0) return res.status(400).json({ error: 'You have already voted!' });

    db.query('INSERT INTO votes SET ?', voteData, (err, result) => {
      if (err) return res.status(500).json({ error: 'Failed to submit vote.' });
      res.json({ message: 'Vote submitted successfully!' });
    });
  });
};