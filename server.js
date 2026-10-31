import express from 'express';
const app = express();

//TESTANDO CONEXÃO COM O BANCO DE DADOS
import connection from './database/connection.js';
app.use(express.json());

app.get('/api/funcionarios', async (req, res) => {
    try {
        const [resultado] = await connection.query(
            'SELECT * FROM funcionarios'
        );

        res.json(resultado);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            erro: 'Erro ao consultar funcionários'
        });
    }
});

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});

// ROTAS PRO AUTH.JS
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';

dotenv.config();

// Rotas de autenticação
app.use('/api', authRoutes);

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});