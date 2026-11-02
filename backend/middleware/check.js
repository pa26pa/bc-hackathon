import jwt from 'jsonwebtoken';

function verificarToken(req, res, next) {

    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).json({
            mensagem: 'Token não informado!'
        });
    }

    const tokenLimpo = token.split(' ')[1];

    try {

        const dados = jwt.verify(
            tokenLimpo,
            process.env.JWT_SECRET
        );

        req.usuarioId = dados.id;

        if (dados.codigo) {
            req.usuarioCodigo = dados.codigo
        }
        next();

    } catch (error) {

        return res.status(401).json({
            mensagem: 'Token inválido ou expirado!'
        });

    }
}

export default verificarToken;