import connection from '../database/connection.js';

// Registra uma ação na tabela historico.
// Tipos permitidos: edicao, senha e email.
export async function registrarHistorico(tipo, descricao, banco = connection) {
    const tiposPermitidos = ['edicao', 'senha', 'email'];

    if (!tiposPermitidos.includes(tipo)) {
        throw new Error('Tipo de histórico inválido.');
    }

    if (!descricao || !descricao.trim()) {
        throw new Error('A descrição do histórico é obrigatória.');
    }

    await banco.query(
        `INSERT INTO historico
            (quando, modificacao, status_modificacao)
         VALUES (CURRENT_TIMESTAMP, ?, ?)`,
        [descricao.trim(), tipo]
    );
}
