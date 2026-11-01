import express from 'express';
import connection from '../database/connection.js';
import enviar_email from '../middleware/email_sender.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import verificarToken from '../middleware/check.js'; 

const router = express.Router();

router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                mensagem: 'Informe email e senha!'
            });
        }

        const [resultado] = await connection.query(
            'SELECT * FROM usuario WHERE email = ?',
            [email]
        );

        if (resultado.length === 0) {
            return res.status(401).json({
                mensagem: 'Email ou senha incorretos!'
            });
        }

        const usuario = resultado[0];

        const senhaCorreta = await bcrypt.compare(
            senha,
            usuario.senha
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                mensagem: 'Email ou senha incorretos!'
            });
        }

        const token = jwt.sign(
            { id: usuario.id },
            process.env.JWT_SECRET,
            { expiresIn: '5h' }
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

router.get('/perfil', verificarToken, async (req, res) => {
    try {
        const [resultado] = await connection.query(
            'SELECT id, nome, email FROM usuarios WHERE id = ?',
            [req.usuarioId]
        );
        res.json(resultado[0]);
        return res.status(200).json({
            mensagem: 'Perfil validado',
            token: token,
            info: {
                nome: resultado.nome,
                email: resultado.email
            }
        })

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao carregar perfil' });
    }
});

router.get('/horarios',  verificarToken, async (req, res) => {
    try {
        const resultado = await connection.query(
            'select * from horarios'
        );
        
        res.status(200).json({
            mensagem: 'Horarios requisitados com sucesso',
            token: token,
            horarios: resultado
        })

    } catch (error) {
        console.log(error);
        res.status(500).json({
            mensagem: 'Erro ao requisitar dados'
        })
    }
});

router.post('/teste_email', async(req,res) => {
    const email = req.email;
    const codigo = Math.floor(Math.random() * 900000) + 100000;
    const resposta = await enviar_email(email, codigo)
    
    if (!resposta) {
        res.status(500).json({
            mensagem: 'Não foi possivel enviar o email'
        })    
    }

    const token = jwt.sign(
        { codigo: codigo },
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
    );

    res.status(200).json({
        mensagem: 'Email enviado sucesso',
        token: token
    })
})

router.post('/checar_email', verificarToken, async(req,res) => {
    const codigo_guardado = req.usuarioCodigo
    const codigo_inserido = req.codigo

    if (codigo_guardado !== codigo_inserido) {
        res.status(400).json({
            mensagem: 'Codigo incorreto'
        })   
    }
    
    res.status(200).json({
        mensagem: 'Codigo correto'
    })   
})
// Lari, faz o codigo antes dele Não depois
export default router