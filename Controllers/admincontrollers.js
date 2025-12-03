const db = require('../Config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const xlsx = require('xlsx');

// const Admin = require('../models/Admin');
const multer = require('multer');
const path = require('path'); 
const mysql = require('mysql');
const upload = multer({ dest: 'uploads/' });
const fs = require("fs");
// Register Admin (existing code)
exports.register = (req, res) => {
    const { name, email, password } = req.body;

    // Check if the email already exists
    const checkEmailQuery = 'SELECT * FROM admin WHERE email = ?';
    db.query(checkEmailQuery, [email], (err, results) => {
        if (err) {
            console.error('Error checking email:', err);
            return res.status(500).json({ error: 'Error checking email' });
        }
        if (results.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);
        const query = 'INSERT INTO admin (name, email, password) VALUES (?, ?, ?)';
        db.query(query, [name, email, hashedPassword], (err, results) => {
            if (err) {
                console.error('Error inserting data:', err);
                return res.status(500).json({ error: 'Error registering admin' });
            }
            res.status(201).json({ message: 'Admin registered successfully' });
        });
    });
};
// Explana


// Admin Login Function
exports.login = (req, res) => {
    const { email, password } = req.body;

    // Check if the email exists
    const checkEmailQuery = 'SELECT * FROM admin WHERE email = ?';
    db.query(checkEmailQuery, [email], (err, results) => {
        if (err) {
            console.error('Error checking email:', err);
            return res.status(500).json({ error: 'Error checking email' });
        }

        // If email not found
        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const admin = results[0];

        // Compare password
        const passwordMatch = bcrypt.compareSync(password, admin.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = jwt.sign({ id: admin.id, email: admin.email }, 'your_jwt_secret', { expiresIn: '1h' });

        res.status(200).json({
            message: 'Login successful',
            token: token,
            admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email
            }
        });
    });
};


exports.logout = (req, res) => {
    // Since JWT is stateless, there is no server-side session to destroy.
    // However, you can handle client-side token removal and inform the client.
    res.status(200).json({ message: 'Logout successful' });
};

// Forgot Password
exports.forgotPassword = (req, res) => {
    const { email } = req.body;

    const query = 'SELECT * FROM admin WHERE email = ?';
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Admin not found with that email' });
        }

        const admin = results[0];
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000).toISOString().slice(0, 19).replace('T', ' '); // Format as YYYY-MM-DD HH:MM:SS

        const updateQuery = 'UPDATE admin SET reset_token = ?, reset_token_expiry = ? WHERE email = ?';
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

            const resetUrl = `http://localhost:5173/admin/reset-password?token=${resetToken}`;
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

    const query = 'SELECT * FROM admin WHERE reset_token = ? AND reset_token_expiry > ?';
    db.query(query, [token, Date.now()], (err, results) => {
        if (err) {
            console.error('Error validating reset token:', err);
            return res.status(500).json({ error: 'Error validating reset token' });
        }
        if (results.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        const admin = results[0];
        const hashedPassword = bcrypt.hashSync(password, 10);
        const updateQuery = 'UPDATE admin SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE email = ?';
        db.query(updateQuery, [hashedPassword, admin.email], (err) => {
            if (err) {
                console.error('Error updating password:', err);
                return res.status(500).json({ error: 'Error updating password' });
            }
            res.status(200).json({ message: 'Password reset successfully' });
        });
    });
};

// Check Student ID
exports.createStudent = (req, res) => {
    const { reg, name, class_section, password } = req.body;

    // Check for existing student with the same reg or email
    const checkQuery = 'SELECT * FROM student WHERE reg = ?';
    db.query(checkQuery, [reg], (err, results) => {
        if (err) {
            return res.status(500).send({ error: 'Database error' });
        }

        const dateCreated = new Date().toISOString().split("T")[0]

        if (results.length > 0) {
            return res.status(400).json({ error: 'Student with this registration number or email already exists.' });
        }
        const hashedPassword = bcrypt.hashSync(password, 10);
        const sql = 'INSERT INTO student (reg, name, class_section, password, dateCreated) VALUES (?, ?, ?, ?, ?)';

        db.query(sql, [reg, name, class_section, hashedPassword, dateCreated], (err, results) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    const duplicateField = err.sqlMessage.includes('reg');
                    return res.status(400).json({ error: `Duplicate ${duplicateField}: ${duplicateField} already exists.` });
                }
                return res.status(500).send({ error: 'Database error' });
            }

            const insertedId = results.insertId;

            res.status(201).json({
                message: 'Student created successfully',
                student: { 
                    id: insertedId, 
                    reg, 
                    name, 
                    class_section, 
                    dateCreated 
                }
            });
        });

    });
};



// Check All Students
exports.checkAllStudents = (req, res) => {
    const sql = 'SELECT * FROM student ORDER BY reg';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).send({ error: 'Database error' });
        if (results.length === 0) return res.status(404).send({ error: 'No students found' });
        res.status(200).json(results);
    });
};



// Delete a student by ID
exports.deleteStudent = (req, res) => {
    const { studentId } = req.params; // Assuming the student ID is passed as a URL parameter

    if (!studentId) {
        return res.status(400).json({ error: 'Student ID is required' });
    }

    // Step 1: Check if the student exists in the student table
    const checkStudentQuery = 'SELECT id FROM student WHERE id = ?';
    db.query(checkStudentQuery, [studentId], (err, results) => {
        if (err) {
            console.error('Error checking student ID:', err.message);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Step 2: Proceed to delete the student if they exist
        const deleteStudentQuery = 'DELETE FROM student WHERE id = ?';
        db.query(deleteStudentQuery, [studentId], (err, results) => {
            if (err) {
                console.error('Error deleting student:', err.message);
                return res.status(500).json({ error: 'Internal server error' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Student could not be deleted' });
            }

            res.status(200).json({ message: 'Student deleted successfully' });
        });
    });
};


// Fetch student by ID
exports.getStudentById = (req, res) => {
    const { studentId } = req.params; // Extract studentId from the URL parameter
  
    // Validate input
    if (!studentId) {
        return res.status(400).json({ error: 'Student ID is required' });
    }
  
    const query = 'SELECT * FROM student WHERE id = ?';
    db.query(query, [studentId], (err, results) => {
        if (err) {
            console.error('Error fetching student:', err.message);
            return res.status(500).json({ error: 'Internal server error' });
        }
  
        if (results.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
  
        res.status(200).json(results[0]); // Send the first (and only) result
    });
};


// Update student by ID and also update attendance records
// exports.updateStudentById = (req, res) => {
//     const { studentId } = req.params;
//     const { name, reg, email, class_section, password } = req.body;

//     if (!name || !reg || !class_section) {
//         return res.status(400).json({ error: 'Name, Reg Or Class Section fields are required' });
//     }

//     const getOldRegQuery = 'SELECT reg FROM student WHERE id = ?';
//     db.query(getOldRegQuery, [studentId], (err, results) => {
//         if (err) {
//             return res.status(500).json({ error: 'Internal server error' });
//         }
//         if (results.length === 0) {
//             return res.status(404).json({ error: 'Student not found' });
//         }

//         const oldReg = results[0].reg;
//         const hashedPassword = bcrypt.hashSync(password, 10);

//         const updateStudentQuery = 'UPDATE student SET name = ?, reg = ?, class_section = ?, email = ?, password = ? WHERE id = ?';
//         db.query(updateStudentQuery, [name, reg, class_section, email, hashedPassword, studentId], (err, results) => {
//             if (err) {
//                 return res.status(500).json({ error: 'Internal server error' });
//             }
//             if (results.affectedRows === 0) {
//                 return res.status(404).json({ error: 'Student not found' });
//             }

//             // ✅ Send response back to frontend
//             return res.status(200).json({
//                 message: 'Student updated successfully',
//                 student: { id: studentId, name, reg, email, class_section, hashedPassword }
//             });
//         });
//     });
// };
// Update student by ID
exports.updateStudentById = async (req, res) => {
    const { studentId } = req.params;
    const { name, reg, class_section, password } = req.body;

    if (!name || !reg || !class_section) {
        return res.status(400).json({ error: 'Name, Reg, or Class Section fields are required' });
    }

    // Fetch the old student
    const getStudentQuery = 'SELECT * FROM student WHERE id = ?';
    db.query(getStudentQuery, [studentId], async (err, results) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });
        if (results.length === 0) return res.status(404).json({ error: 'Student not found' });

        const oldStudent = results[0];
        let hashedPassword = oldStudent.password; // Keep old password if not updated

        if (password && password.trim() !== '') {
            hashedPassword = await bcrypt.hash(password, 10); // Hash new password
        }

        const updateStudentQuery = `
            UPDATE student
            SET name = ?, reg = ?, class_section = ?, password = ?
            WHERE id = ?
        `;
        db.query(
            updateStudentQuery,
            [name, reg, class_section, hashedPassword, studentId],
            (err, results) => {
                if (err) return res.status(500).json({ error: 'Internal server error' });
                if (results.affectedRows === 0) return res.status(404).json({ error: 'Student not found' });

                res.status(200).json({
                    message: 'Student updated successfully',
                    student: { id: studentId, name, reg, class_section } // do not send hashed password
                });
            }
        );
    });
};



exports.importStudents = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const filePath = req.file.path;
        console.log("Uploaded file path:", filePath);

        const allowedExtensions = [".xls", ".xlsx", ".csv"];
        const fileExtension = path.extname(filePath).toLowerCase();

        if (!allowedExtensions.includes(fileExtension)) {
            return res.status(400).json({
                error: "Invalid file format. Only .xls, .xlsx, or .csv are allowed."
            });
        }

        // Read the Excel file
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        // Process the data
        const dateCreated = new Date().toISOString().split("T")[0];
        let statusMsg = "";
        const importedStudents = [];

        const insertPromises = data.map(async (row) => {
            const reg = row.reg ? String(row.reg).trim() : null;
            const name = row.name ? String(row.name).trim() : null;
            const class_section = row.class_section ? String(row.class_section).trim() : null;
            let password = row.reg ? String(row.reg).trim() : null; // Force string conversion

            console.log(`Processing Student: ${reg}, ${name}, ${class_section}, ${password}`);

            // Validate registration number and name
            if (!reg || !name || !class_section || !password) {
                statusMsg += `Invalid data for student (missing reg or name or class_section)!\n`;
                return;
            }

            // // Fixing short passwords (If password is a number like 1234, it should be a string)
            // if (!password || password.length < 6) {
            //     password = "defaultPass123"; // Assign a default password if missing or too short
            // }

            try {
                // Hash password
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(password, saltRounds);

                // Check if student already exists
                const [existingStudents] = await db.promise().query(
                    "SELECT * FROM student WHERE reg = ?",
                    [reg]
                );

                if (existingStudents.length > 0) {
                    statusMsg += `Student with Registration '${reg}' already exists!\n`;
                } else {
                    // Insert into database
                    await db.promise().query(
                        "INSERT INTO student (reg, name, class_section, password, dateCreated) VALUES (?, ?, ?, ?, ?)",
                        [reg, name, class_section, hashedPassword, dateCreated]
                    );
                    importedStudents.push({ reg, name, class_section, password: "********", dateCreated });
                }
            } catch (err) {
                console.error(`Error processing student '${reg}':`, err);
                statusMsg += `Error inserting student '${reg}' into the database!\n`;
            }
        });

        await Promise.all(insertPromises);

        console.log("Imported students:", importedStudents);

        // Delete the uploaded file after processing
        fs.unlink(filePath, (err) => {
            if (err) console.error("Error deleting file:", err);
            else console.log("Uploaded file deleted successfully.");
        });

        res.status(200).json({ 
            message: "Students imported successfully!", 
            students: importedStudents, 
            statusMsg 
        });

    } catch (error) {
        console.error("Error in importStudents:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};



// ================== Candidates Controllers ================== //

// Get all candidates
exports.getAllCandidates = (req, res) => {
    const sql = 'SELECT * FROM candidates ORDER BY designation';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) return res.status(404).json({ error: 'No candidates found' });
        res.status(200).json(results);
    });
};

// Delete candidate by ID
exports.deleteCandidate = (req, res) => {
    const { candidateId } = req.params;

    if (!candidateId) return res.status(400).json({ error: 'Candidate ID is required' });

    const checkQuery = 'SELECT id FROM candidates WHERE id = ?';
    db.query(checkQuery, [candidateId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });
        if (results.length === 0) return res.status(404).json({ error: 'Candidate not found' });

        const deleteQuery = 'DELETE FROM candidates WHERE id = ?';
        db.query(deleteQuery, [candidateId], (err, results) => {
            if (err) return res.status(500).json({ error: 'Internal server error' });
            res.status(200).json({ message: 'Candidate deleted successfully' });
        });
    });
};

// Get candidate by ID
exports.getCandidateById = (req, res) => {
    const { candidateId } = req.params;

    if (!candidateId) return res.status(400).json({ error: 'Candidate ID is required' });

    const query = 'SELECT * FROM candidates WHERE id = ?';
    db.query(query, [candidateId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });
        if (results.length === 0) return res.status(404).json({ error: 'Candidate not found' });
        res.status(200).json(results[0]);
    });
};

// Update candidate by ID
exports.updateCandidateById = (req, res) => {
    const { candidateId } = req.params;
    const {name, gender, class: cls, section, house_group, symbol, designation } = req.body;

    if (!name || !gender || !cls || !section) {
        return res.status(400).json({ error: 'Name, Gender, Class, or Section fields are required' });
    }

    const updateQuery = `
        UPDATE candidates
        SET name = ?, gender = ?, class = ?, section = ?, house_group = ?, symbol = ?, designation = ?
        WHERE id = ?
    `;

    db.query(
        updateQuery,
        [name, gender, cls, section, house_group || null, symbol || null, designation || null, candidateId],
        (err, results) => {
            if (err) return res.status(500).json({ error: 'Internal server error' });
            if (results.affectedRows === 0) return res.status(404).json({ error: 'Candidate not found' });

            res.status(200).json({
                message: 'Candidate updated successfully',
                candidate: { id: candidateId, name, gender, class: cls, section, house_group, symbol, designation }
            });
        }
    );
};

// Add candidate
exports.addCandidate = (req, res) => {
    const {name, gender, class: cls, section, house_group, symbol, designation } = req.body;

    if (!name || !cls || !section) {
        return res.status(400).json({ error: 'Name, Class, and Section are required' });
    }

    const dateCreated = new Date().toISOString().split("T")[0];

    const insertQuery = `
        INSERT INTO candidates 
        (name, gender, class, section, house_group, symbol, designation, dateCreated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        insertQuery,
        [name, gender, cls, section, house_group, symbol, designation, dateCreated],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ error: 'Database error' });
            }

            res.status(200).json({
                message: 'Candidate added successfully',
                candidate: {
                    id: result.insertId,
                    name,
                    gender,
                    class: cls,
                    section,
                    house_group,
                    symbol,
                    designation,
                    dateCreated
                }
            });
        }
    );
};


// Import candidates from Excel/CSV
exports.importCandidates = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const filePath = req.file.path;
        console.log("Uploaded file path:", filePath);

        const allowedExtensions = [".xls", ".xlsx", ".csv"];
        const fileExtension = path.extname(filePath).toLowerCase();

        if (!allowedExtensions.includes(fileExtension)) {
            return res.status(400).json({
                error: "Invalid file format. Only .xls, .xlsx, or .csv are allowed."
            });
        }

        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        const dateCreated = new Date().toISOString().split("T")[0];
        const importedCandidates = [];
        let statusMsg = "";

        const insertPromises = data.map(async (row) => {
            const name = row.name ? String(row.name).trim() : null;
            const gender = row.gender ? String(row.gender).trim() : null;
            const cls = row.class ? String(row.class).trim() : null;
            const section = row.section ? String(row.section).trim() : null;
            const house_group = row.house_group ? String(row.house_group).trim() : null;
            const symbol = row.symbol ? String(row.symbol).trim() : null;
            const designation = row.designation ? String(row.designation).trim() : null;

            if (!gender || !name || !cls || !section) {
                statusMsg += `Invalid data for candidate (gender, name, class, or section)!\n`;
                return;
            }

            try {
                const [existing] = await db.promise().query(
                    "SELECT * FROM candidates WHERE name = ?",
                    [name]
                );

                if (existing.length > 0) {
                    statusMsg += `Candidate with Registration '${name}' already exists!\n`;
                } else {
                    await db.promise().query(
                        `INSERT INTO candidates
                        (name, gender, class, section, house_group, symbol, designation, dateCreated)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [name, gender, cls, section, house_group, symbol, designation, dateCreated]
                    );

                    importedCandidates.push({ name, gender, class: cls, section, house_group, symbol, designation, dateCreated });
                }
            } catch (err) {
                console.error(`Error inserting candidate '${name}':`, err);
                statusMsg += `Error inserting candidate '${name}' into database!\n`;
            }
        });

        await Promise.all(insertPromises);

        fs.unlink(filePath, (err) => {
            if (err) console.error("Error deleting file:", err);
            else console.log("Uploaded file deleted successfully.");
        });

        res.status(200).json({
            message: "Candidates imported successfully!",
            candidates: importedCandidates,
            statusMsg
        });

    } catch (error) {
        console.error("Error in importCandidates:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.getVoteResults = async (req, res) => {
  try {
    // Define all positions
    const positions = [
      "ALAM_Boys_House_Captian_id",
      "ALAM_Boys_Vice_House_Captian_id",
      "ALAM_Girls_House_Captian_id",
      "ALAM_Girls_Vice_House_Captian_id",
      "JINNAH_Boys_House_Captian_id",
      "JINNAH_Boys_Vice_House_Captian_id",
      "JINNAH_Girls_House_Captian_id",
      "JINNAH_Girls_Vice_House_Captian_id",
      "IQBAL_Boys_House_Captian_id",
      "IQBAL_Boys_Vice_House_Captian_id",
      "IQBAL_Girls_House_Captian_id",
      "IQBAL_Girls_Vice_House_Captian_id",
      "MINHAS_Boys_House_Captian_id",
      "MINHAS_Boys_Vice_House_Captian_id",
      "MINHAS_Girls_House_Captian_id",
      "MINHAS_Girls_Vice_House_Captian_id"
    ];

    let results = {};

    for (const position of positions) {
      const query = `
        SELECT ${position} as candidate_id, COUNT(${position}) as votes
        FROM votes
        WHERE ${position} IS NOT NULL
        GROUP BY ${position}
        ORDER BY votes DESC
        LIMIT 1
      `;

      const [rows] = await db.promise().query(query);

      if (rows.length > 0) {
        const candidateId = rows[0].candidate_id;
        const votes = rows[0].votes;

        // Get candidate name
        const [candidate] = await db.promise().query(
          `SELECT name FROM candidates WHERE id = ?`,
          [candidateId]
        );

        results[position] = {
          name: candidate[0]?.name || 'Unknown',
          votes: votes
        };
      } else {
        results[position] = {
          name: null,
          votes: 0
        };
      }
    }

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while fetching vote results' });
  }
};