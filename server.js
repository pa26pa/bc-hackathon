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
    console.log('LETA: http://localhost:3000/usuarios')
});