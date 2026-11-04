
import jwt from 'jsonwebtoken';

function verificarToken(req, res, next) {
    const autorizacao = req.headers.authorization;

    if (!autorizacao) {
        return res.status(401).json({
            mensagem: 'Token não informado!'
        });
    }

    // Separa a palavra Bearer do token
    const tokenLimpo = autorizacao.split(' ')[1];

    if (!tokenLimpo) {
        return res.status(401).json({
            mensagem: 'Formato de token inválido!'
        });
    }

    try {
        const dados = jwt.verify(
            tokenLimpo,
            process.env.JWT_SECRET
        );

        // Transfere os dados do token para a requisição
        req.usuarioId = dados.id;
        req.email = dados.email;
        req.status = dados.status;

        if (dados.codigo) {
            req.usuarioCodigo = dados.codigo;
        }

        console.log('ID:', req.usuarioId);
        console.log('EMAIL:', req.email);
        console.log('STATUS:', req.status);

        next();

    } catch (error) {
        console.log('ERRO NO TOKEN:', error.message);

        return res.status(401).json({
            mensagem: 'Token inválido ou expirado!'
        });
    }
}

export default verificarToken;
