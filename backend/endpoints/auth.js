
import express from 'express';
import connection from '../database/connection.js';
import enviar_email from '../middleware/email_sender.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import verificarToken from '../middleware/check.js';
import { registrarHistorico } from '../middleware/historico.js';

const router = express.Router();

// ===== AUXILIARES =====

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Erro com status HTTP, usado para devolver mensagens de validação ao front.
class ErroRequisicao extends Error {
    constructor(mensagem, status = 400) {
        super(mensagem);
        this.status = status;
    }
}

// Mesmas regras de senha exibidas no front-end.
function senhaForte(senha) {
    return (
        typeof senha === 'string' &&
        senha.length >= 8 &&
        /[A-Z]/.test(senha) &&
        /\d/.test(senha) &&
        /[^A-Za-z0-9]/.test(senha)
    );
}

// Executa várias queries na mesma transação (alteração + histórico).
async function comTransacao(funcao) {
    const banco = await connection.getConnection();

    try {
        await banco.beginTransaction();
        const resultado = await funcao(banco);
        await banco.commit();
        return resultado;
    } catch (error) {
        await banco.rollback();
        throw error;
    } finally {
        banco.release();
    }
}

// Grava o JWT da sessão no cookie HttpOnly (mesmas opções do login).
function gravarCookieSessao(res, usuario) {
    const token = jwt.sign(
        {
            id: usuario.id_usuario,
            email: usuario.email,
            status: usuario.status_user
        },
        process.env.JWT_SECRET,
        { expiresIn: '5h' }
    );

    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 5 * 60 * 60 * 1000,
        path: '/'
    });
}


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



// Listas usadas nas sugestões do modal de edição de aula.
router.get('/opcoes_edicao', verificarToken, async (req, res) => {
    try {
        const [materias] = await connection.query(
            'SELECT nome FROM materias ORDER BY nome'
        );

        const [professores] = await connection.query(
            'SELECT nome_completo AS nome FROM professores ORDER BY nome_completo'
        );

        return res.status(200).json({
            materias: materias.map(m => m.nome),
            professores: professores.map(p => p.nome)
        });

    } catch (error) {
        console.error('ERRO AO CARREGAR OPÇÕES DE EDIÇÃO:', error);
        return res.status(500).json({ mensagem: 'Erro ao carregar as opções.' });
    }
});


// Edita disciplina, professor e sala de uma aula e registra no histórico.
router.put('/horarios/:id', verificarToken, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            throw new ErroRequisicao('Aula inválida.');
        }

        const disciplina = String(req.body.disciplina ?? '').trim();
        const professor = String(req.body.professor ?? '').trim();
        const sala = String(req.body.sala ?? '').trim();

        if (!disciplina) {
            throw new ErroRequisicao('Informe a disciplina.');
        }

        if (sala.length > 100) {
            throw new ErroRequisicao('A sala deve ter no máximo 100 caracteres.');
        }

        const resposta = await comTransacao(async (banco) => {

            const [aulas] = await banco.query(`
                SELECT
                    h.id_horario,
                    h.dia_semana,
                    h.horario,
                    h.sala,
                    h.materia AS id_materia,
                    h.professor AS id_professor,
                    m.nome AS materia,
                    p.nome_completo AS professor,
                    t.serie,
                    t.curso,
                    t.grupo
                FROM horarios h
                INNER JOIN turmas t ON h.turma = t.id_turma
                INNER JOIN materias m ON h.materia = m.id_materia
                LEFT JOIN professores p ON h.professor = p.id_professor
                WHERE h.id_horario = ?
            `, [id]);

            if (aulas.length === 0) {
                throw new ErroRequisicao('Aula não encontrada.', 404);
            }

            const atual = aulas[0];

            // Disciplina: precisa existir na tabela materias.
            const [materias] = await banco.query(
                'SELECT id_materia, nome FROM materias WHERE nome = ?',
                [disciplina]
            );

            if (materias.length === 0) {
                throw new ErroRequisicao(
                    `Disciplina "${disciplina}" não encontrada. Escolha uma da lista.`
                );
            }

            // Professor: opcional, mas se informado precisa existir.
            let novoProfessor = { id_professor: null, nome_completo: null };

            if (professor) {
                const [professores] = await banco.query(
                    'SELECT id_professor, nome_completo FROM professores WHERE nome_completo = ?',
                    [professor]
                );

                if (professores.length === 0) {
                    throw new ErroRequisicao(
                        `Professor "${professor}" não encontrado. Escolha um da lista.`
                    );
                }

                novoProfessor = professores[0];
            }

            const novaMateria = materias[0];
            const novaSala = sala || null;

            // Descobre o que realmente mudou.
            const mudancas = [];

            if (atual.id_materia !== novaMateria.id_materia) {
                mudancas.push(`disciplina de "${atual.materia}" para "${novaMateria.nome}"`);
            }

            if ((atual.id_professor ?? null) !== novoProfessor.id_professor) {
                mudancas.push(
                    `professor de "${atual.professor || 'não definido'}" para "${novoProfessor.nome_completo || 'não definido'}"`
                );
            }

            if ((atual.sala || null) !== novaSala) {
                mudancas.push(`sala de "${atual.sala || 'não definida'}" para "${novaSala || 'não definida'}"`);
            }

            const aulaAtualizada = {
                id_horario: atual.id_horario,
                id_materia: novaMateria.id_materia,
                materia: novaMateria.nome,
                id_professor: novoProfessor.id_professor,
                professor: novoProfessor.nome_completo,
                sala: novaSala
            };

            if (mudancas.length === 0) {
                return { alterado: false, aula: aulaAtualizada };
            }

            await banco.query(
                'UPDATE horarios SET materia = ?, professor = ?, sala = ? WHERE id_horario = ?',
                [novaMateria.id_materia, novoProfessor.id_professor, novaSala, id]
            );

            const grupo = atual.grupo === 'B' ? 'Grupo B' : 'Grupo A/Classe inteira';
            const hora = String(atual.horario).slice(0, 5);

            await registrarHistorico(
                'edicao',
                `Aula editada (${atual.dia_semana}, ${hora}, ${atual.serie}ª série ${atual.curso}, ${grupo}): ${mudancas.join('; ')}.`,
                banco
            );

            return { alterado: true, aula: aulaAtualizada };
        });

        return res.status(200).json({
            mensagem: resposta.alterado
                ? 'Aula atualizada com sucesso!'
                : 'Nenhuma alteração foi feita.',
            ...resposta
        });

    } catch (error) {

        if (error instanceof ErroRequisicao) {
            return res.status(error.status).json({ mensagem: error.message });
        }

        console.error('ERRO AO EDITAR AULA:', error);
        return res.status(500).json({ mensagem: 'Erro interno ao editar a aula.' });
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

        await registrarHistorico(
            'senha',
            'A senha da conta foi redefinida.'
        );

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



// ===== SEGURANÇA DA CONTA =====
// Existe um único usuário (o admin): trocar o e-mail SUBSTITUI o anterior.

router.post('/alterar_email', verificarToken, async (req, res) => {
    try {
        const emailAtual = String(req.body.email_atual ?? '').trim();
        const novoEmail = String(req.body.novo_email ?? '').trim();

        if (!emailAtual || !novoEmail) {
            throw new ErroRequisicao('Informe o e-mail atual e o novo e-mail.');
        }

        if (!emailRegex.test(novoEmail) || novoEmail.length > 100) {
            throw new ErroRequisicao('Digite um novo e-mail válido.');
        }

        const [usuarios] = await connection.query(
            'SELECT id_usuario, email FROM usuario WHERE id_usuario = ?',
            [req.usuarioId]
        );

        if (usuarios.length === 0) {
            throw new ErroRequisicao('Usuário não encontrado.', 404);
        }

        const usuario = usuarios[0];

        if (emailAtual.toLowerCase() !== usuario.email.toLowerCase()) {
            throw new ErroRequisicao('O e-mail atual informado não confere.');
        }

        if (novoEmail.toLowerCase() === usuario.email.toLowerCase()) {
            throw new ErroRequisicao('O novo e-mail precisa ser diferente do atual.');
        }

        await comTransacao(async (banco) => {
            await banco.query(
                'UPDATE usuario SET email = ?, status_user = ? WHERE id_usuario = ?',
                [novoEmail, 'admin', usuario.id_usuario]
            );

            await registrarHistorico(
                'email',
                `O e-mail da conta foi alterado de ${usuario.email} para ${novoEmail}.`,
                banco
            );
        });

        // Renova a sessão: o JWT antigo ainda carregaria o e-mail anterior.
        gravarCookieSessao(res, {
            id_usuario: usuario.id_usuario,
            email: novoEmail,
            status_user: 'admin'
        });

        return res.status(200).json({
            mensagem: 'E-mail atualizado com sucesso!',
            email: novoEmail
        });

    } catch (error) {

        if (error instanceof ErroRequisicao) {
            return res.status(error.status).json({ mensagem: error.message });
        }

        console.error('ERRO AO ALTERAR E-MAIL:', error);
        return res.status(500).json({ mensagem: 'Erro interno ao alterar o e-mail.' });
    }
});


router.post('/alterar_senha', verificarToken, async (req, res) => {
    try {
        const { senha_atual, senha_nova } = req.body;

        if (!senha_atual || !senha_nova) {
            throw new ErroRequisicao('Informe a senha atual e a nova senha.');
        }

        if (!senhaForte(senha_nova)) {
            throw new ErroRequisicao(
                'A nova senha precisa ter 8 caracteres, uma maiúscula, um número e um caractere especial.'
            );
        }

        const [usuarios] = await connection.query(
            'SELECT id_usuario, senha FROM usuario WHERE id_usuario = ?',
            [req.usuarioId]
        );

        if (usuarios.length === 0) {
            throw new ErroRequisicao('Usuário não encontrado.', 404);
        }

        const usuario = usuarios[0];

        const senhaCorreta = await bcrypt.compare(String(senha_atual), usuario.senha);

        if (!senhaCorreta) {
            throw new ErroRequisicao('A senha atual está incorreta.');
        }

        if (senha_atual === senha_nova) {
            throw new ErroRequisicao('A nova senha precisa ser diferente da atual.');
        }

        const senhaCriptografada = await bcrypt.hash(senha_nova, 10);

        await comTransacao(async (banco) => {
            await banco.query(
                'UPDATE usuario SET senha = ? WHERE id_usuario = ?',
                [senhaCriptografada, usuario.id_usuario]
            );

            await registrarHistorico(
                'senha',
                'A senha da conta foi alterada.',
                banco
            );
        });

        return res.status(200).json({
            mensagem: 'Senha atualizada com sucesso!'
        });

    } catch (error) {

        if (error instanceof ErroRequisicao) {
            return res.status(error.status).json({ mensagem: error.message });
        }

        console.error('ERRO AO ALTERAR SENHA:', error);
        return res.status(500).json({ mensagem: 'Erro interno ao alterar a senha.' });
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


// ===== HISTÓRICO DE ALTERAÇÕES =====
router.get('/historico', verificarToken, async (req, res) => {
    try {
        const [historico] = await connection.query(`
            SELECT
                id_mudanca,
                status_modificacao AS tipo,
                modificacao AS descricao,
                DATE_FORMAT(quando, '%d/%m/%Y %H:%i') AS data
            FROM historico
            ORDER BY quando DESC, id_mudanca DESC
        `);

        return res.status(200).json({
            mensagem: 'Histórico carregado com sucesso!',
            historico
        });

    } catch (error) {
        console.error('ERRO AO CARREGAR HISTÓRICO:', error);

        return res.status(500).json({
            mensagem: 'Erro ao carregar o histórico.'
        });
    }
});


// Lari, faz o codigo antes dele Não depois
export default router;
