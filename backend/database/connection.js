import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const connection = mysql.createPool({
    host: process.env.DB_HOST,
    port: 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Horário de Brasília (UTC-3, sem horário de verão).
// O servidor do Railway roda em UTC; sem isto, CURRENT_TIMESTAMP e o
// DATE_FORMAT do histórico usariam o horário do servidor.
connection.pool.on('connection', (conexao) => {
    conexao.query("SET time_zone = '-03:00'");
});

export default connection;