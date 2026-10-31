import express from 'express';
import connection from '../database/connection.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import verificarToken from '../middleware/check.js'; // Movido para o topo do arquivo

const router = express.Router();

// LOGIN
router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                mensagem: 'Informe email e senha!'
            });
        }

        // Procurar usuário pelo email
        const [resultado] = await connection.query(
            'SELECT * FROM usuarios WHERE email = ?',
            [email]
        );

        if (resultado.length === 0) {
            return res.status(401).json({
                mensagem: 'Email ou senha incorretos!'
            });
        }

        const usuario = resultado[0];

        // Comparar senha digitada com hash armazenado
        const senhaCorreta = await bcrypt.compare(
            senha,
            usuario.senha
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                mensagem: 'Email ou senha incorretos!'
            });
        }

        // Gerar token de autenticação
        const token = jwt.sign(
            { id: usuario.id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        return res.status(200).json({
            mensagem: 'Login realizado com sucesso!',
            token: token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            mensagem: 'Erro interno do servidor'
        });
    }
});

// ROTA PRO PERFIL (MIDDLEWARE) - Corrigido para router.get
router.get('/perfil', verificarToken, async (req, res) => {
    try {
        const [resultado] = await connection.query(
            'SELECT id, nome, email FROM usuarios WHERE id = ?',
            [req.usuarioId]
        );
        res.json(resultado[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao carregar perfil' });
    }
});

export default router; // Movido para o final do arquivo