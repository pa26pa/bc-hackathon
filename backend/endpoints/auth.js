import express from 'express';
import connection from '../database/connection.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();

// CADASTRO
router.post('/cadastro', async (req, res) => {
    try {
        const { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({
                mensagem: 'Preencha todos os campos!'
            });
        }

        // Verificar se o email já existe
        const [usuarios] = await connection.query(
            'SELECT id FROM usuarios WHERE email = ?',
            [email]
        );

        if (usuarios.length > 0) {
            return res.status(409).json({
                mensagem: 'Email já cadastrado!'
            });
        }

        // Criptografar a senha
        const senhaHash = await bcrypt.hash(senha, 10);

        // Inserir usuário no banco
        await connection.query(
            'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
            [nome, email, senhaHash]
        );

        return res.status(201).json({
            mensagem: 'Usuário cadastrado com sucesso!'
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            mensagem: 'Erro interno do servidor'
        });
    }
});


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

export default router;

// ROTA PRO PERFIL (MIDDLEWARE)
import verificarToken from './middleware/auth.js';

app.get('/api/perfil', verificarToken, async (req, res) => {

    const [resultado] = await connection.query(
        'SELECT id, nome, email FROM usuarios WHERE id = ?',
        [req.usuarioId]
    );

    res.json(resultado[0]);

});