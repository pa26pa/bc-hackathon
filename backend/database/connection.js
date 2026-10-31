import mysql from 'mysql2/promise';

const connection = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '!Maiero12*05_',
    database: 'escola',
    port: 3306
});

export default connection;