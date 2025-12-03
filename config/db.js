const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'blny9j29dxm2fkd10lks-mysql.services.clever-cloud.com',
    user: 'uzrwqdrmmtiebfoq',
    password: 'O8NBF76xjhlxsImFb5OQ', // Replace with your MySQL password
    database: 'blny9j29dxm2fkd10lks'
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL');
});

module.exports = db;
