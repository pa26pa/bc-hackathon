
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
            {
                id: usuario.id_usuario,
                email: usuario.email,
                status: usuario.status_user
            },
            process.env.JWT_SECRET,
            { expiresIn: '5h' }
        );

        // Salva o JWT em um cookie HttpOnly
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 5 * 60 * 60 * 1000,
            path: '/'
        });

        return res.status(200).json({
            mensagem: 'Login realizado com sucesso!',
            usuario: {
                id: usuario.id_usuario,
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

router.get('/perfil', verificarToken, (req, res) => {
    console.log('EMAIL:', req.email);
    console.log('STATUS:', req.status);

    if (!req.email) {
        return res.status(500).json({
            mensagem: 'Erro ao carregar perfil'
        });
    }

    return res.status(200).json({
        mensagem: 'Perfil validado',
        info: {
            email: req.email,
            status: req.status
        }
    });
});



router.get('/horarios', verificarToken, async (req, res) => {
    try {
        const { turma, grupo, professor, disciplina, sala } = req.query;
        const filtros = [];
        const parametros = [];

        // O valor de turma usa o formato "serie|curso", por exemplo:
        // "1|MTEC - Turma A".
        if (turma) {
            const [serie, curso] = String(turma).split('|');

            if (!serie || !curso || !/^\d+$/.test(serie)) {
                return res.status(400).json({ mensagem: 'Filtro de turma inválido.' });
            }

            filtros.push('t.serie = ?', 't.curso = ?');
            parametros.push(Number(serie), curso);
        }

        if (grupo) {
            filtros.push('t.grupo = ?');
            parametros.push(grupo);
        }

        if (professor) {
            filtros.push('p.id_professor = ?');
            parametros.push(Number(professor));
        }

        if (disciplina) {
            filtros.push('m.id_materia = ?');
            parametros.push(Number(disciplina));
        }

        if (sala) {
            filtros.push('h.sala = ?');
            parametros.push(sala);
        }

        const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

        const [horarios] = await connection.query(`
            SELECT
                h.id_horario,
                h.dia_semana,
                h.aula,
                h.horario,
                h.sala,
                t.id_turma,
                t.serie,
                t.curso,
                t.grupo,
                t.periodo,
                m.id_materia,
                m.nome AS materia,
                p.id_professor,
                p.nome_completo AS professor
            FROM horarios h
            INNER JOIN turmas t
                ON h.turma = t.id_turma
            INNER JOIN materias m
                ON h.materia = m.id_materia
            LEFT JOIN professores p
                ON h.professor = p.id_professor
            ${where}
            ORDER BY
                t.serie,
                t.curso,
                t.grupo,
                FIELD(h.dia_semana, 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'),
                h.horario,
                h.aula
        `, parametros);

        return res.status(200).json({
            mensagem: 'Horários requisitados com sucesso',
            horarios
        });

    } catch (error) {
        console.error('ERRO REAL NA ROTA /horarios:', error);
        return res.status(500).json({ mensagem: 'Erro ao requisitar dados' });
    }
});



// ===== RECUPERAÇÃO DE SENHA =====

// Verifica o token que guarda o código enviado por e-mail.
function verificarCodigoToken(req, res, next) {

    const token = req.cookies?.codigoToken;

    if (!token) {
        return res.status(401).json({
            mensagem: 'Solicite um novo código de recuperação.'
        });
    }

    try {
        const dados = jwt.verify(token, process.env.JWT_SECRET);

        req.emailRecuperacao = dados.email;
        req.codigoRecuperacao = dados.codigo;

        next();

    } catch (error) {
        return res.status(401).json({
            mensagem: 'Código expirado. Solicite um novo.'
        });
    }
}


// Verifica se o código já foi validado.
function verificarResetToken(req, res, next) {

    const token = req.cookies?.resetToken;

    if (!token) {
        return res.status(401).json({
            mensagem: 'Valide o código antes de redefinir a senha.'
        });
    }

    try {
        const dados = jwt.verify(token, process.env.JWT_SECRET);

        if (dados.tipo !== 'redefinicao-senha') {
            return res.status(401).json({
                mensagem: 'Token de recuperação inválido.'
            });
        }

        req.emailRecuperacao = dados.email;

        next();

    } catch (error) {
        return res.status(401).json({
            mensagem: 'Sessão de recuperação expirada. Solicite um novo código.'
        });
    }
}


// ===== ENVIAR CÓDIGO =====
router.post('/enviando_codigo', async (req, res) => {

    try {

        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                mensagem: 'Informe seu e-mail.'
            });
        }

        // Confere se o usuário existe.
        const [usuarios] = await connection.query(
            'SELECT id_usuario, email FROM usuario WHERE email = ?',
            [email.trim()]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                mensagem: 'E-mail não encontrado.'
            });
        }

        const emailUsuario = usuarios[0].email;

        const codigo = String(
            Math.floor(10000 + Math.random() * 90000)
        );

        // Aguarda o envio real do e-mail.
        await enviar_email(emailUsuario, codigo);

        const token = jwt.sign(
            {
                email: emailUsuario,
                codigo: codigo
            },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );

        // Guarda o código em cookie protegido.
        res.cookie('codigoToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 10 * 60 * 1000,
            path: '/api'
        });

        // Invalida uma autorização anterior de redefinição.
        res.clearCookie('resetToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/api'
        });

        return res.status(200).json({
            mensagem: 'Código enviado para seu e-mail!'
        });

    } catch (error) {

        console.error('ERRO AO ENVIAR CÓDIGO:', error);

        return res.status(500).json({
            mensagem: 'Não foi possível enviar o e-mail. Verifique as configurações.'
        });
    }
});


// ===== CONFERIR CÓDIGO =====
router.post('/checar_codigo', verificarCodigoToken, async (req, res) => {

    try {

        const { codigo_inserido } = req.body;

        if (
            String(codigo_inserido || '') !==
            String(req.codigoRecuperacao)
        ) {
            return res.status(400).json({
                mensagem: 'Código incorreto.'
            });
        }

        // O código foi confirmado. Agora autoriza a troca de senha.
        const tokenReset = jwt.sign(
            {
                email: req.emailRecuperacao,
                tipo: 'redefinicao-senha'
            },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );

        res.cookie('resetToken', tokenReset, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 10 * 60 * 1000,
            path: '/api'
        });

        // O código original não precisa mais ficar disponível.
        res.clearCookie('codigoToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/api'
        });

        return res.status(200).json({
            mensagem: 'Código confirmado com sucesso!'
        });

    } catch (error) {

        console.error('ERRO AO CONFERIR CÓDIGO:', error);

        return res.status(500).json({
            mensagem: 'Erro ao verificar o código.'
        });
    }
});


// ===== REDEFINIR SENHA =====
router.post('/redefinir_senha', verificarResetToken, async (req, res) => {

    try {

        const { senha_nova } = req.body;

        if (!senha_nova) {
            return res.status(400).json({
                mensagem: 'Informe a nova senha.'
            });
        }

        const senhaCriptografada = await bcrypt.hash(senha_nova, 10);

        const [resultado] = await connection.query(
            'UPDATE usuario SET senha = ? WHERE email = ?',
            [senhaCriptografada, req.emailRecuperacao]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensagem: 'Usuário não encontrado.'
            });
        }

        res.clearCookie('resetToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/api'
        });

        return res.status(200).json({
            mensagem: 'Senha atualizada com sucesso!'
        });

    } catch (error) {

        console.error('ERRO AO REDEFINIR SENHA:', error);

        return res.status(500).json({
            mensagem: 'Erro interno ao atualizar a senha.'
        });
    }
});


router.post('/atualizar_email_senha', verificarToken, async (req, res) => {
    const { email, senha } = req.body;
    const email_antigo = req.email;

    const senha_pronta = await bcrypt.hash(senha, 10);

    try {
        const resultado = connection.query(
            'update usuario set email = ?, senha = ?, status_user = "admim" where email = ?',
            [email, senha_pronta, email_antigo]
        );

        const token = jwt.sign(
            { status: 'admim' },
            process.env.JWT_SECRET,
            { expiresIn: '5h' }
        );

        res.status(200).json({
            mensagem: 'Email e senha atualizados corretamente',
            token: token
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            mensagem: 'Erro interno'
        });
    }
});

router.post('/logout', (req,res) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path:'/'
        });

        return res.status(200).json({
            mensagem: 'Logout feito com sucesso'
        })
    } catch (error) {
        
        return res.status(500).json({
            mensagem: 'erro ao realizar logout'
        });
    }

});

// Lari, faz o codigo antes dele Não depois
export default router;
