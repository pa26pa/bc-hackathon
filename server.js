import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './backend/endpoints/auth.js'; 
import connection from './backend/database/connection.js';

dotenv.config();

const app = express();

app.use(express.json());

app.use('/api', authRoutes);

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
    console.log('Servidor rodando na porta 3000: http://localhost3000/usuarios');
})
