
async function enviar_email(email_usuario, codigo) {
    try {
        // Recupera as configurações armazenadas no Railway.
        const urlScript = process.env.GOOGLE_SCRIPT_URL;
        const tokenScript = process.env.GOOGLE_SCRIPT_TOKEN;

        // Confere se as variáveis foram configuradas.
        if (!urlScript || !tokenScript) {
            throw new Error(
                'GOOGLE_SCRIPT_URL ou GOOGLE_SCRIPT_TOKEN não configurado.'
            );
        }

        // HTML do e-mail de recuperação de senha.
        const html = `
            <div style="font-family: Arial, sans-serif; background-color: #f4f1f8; padding: 30px;">
                <div style="max-width: 500px; margin: auto; background: white; padding: 30px; border-radius: 12px;">
                    <h2 style="color: #8700e8;">Bruno Consultas</h2>

                    <h3>Redefinição de senha</h3>

                    <p>Olá!</p>

                    <p>
                        Recebemos uma solicitação para redefinir a senha
                        da sua conta Bruno Consultas.
                    </p>

                    <p>Utilize o código abaixo para continuar:</p>

                    <div style="text-align: center; padding: 20px; background: #f4f1f8; border-radius: 10px;">
                        <strong style="font-size: 32px; letter-spacing: 8px; color: #8700e8;">
                            ${codigo}
                        </strong>
                    </div>

                    <p>Este código é válido por 10 minutos.</p>

                    <p>
                        Se você não solicitou a redefinição de senha,
                        ignore este e-mail.
                    </p>

                    <hr>

                    <small>Bruno Consultas — E-mail automático. Não responda.</small>
                </div>
            </div>
        `;

        // Dados enviados ao Google Apps Script.
        const dados = {
            token: tokenScript,
            to: email_usuario,
            subject: 'Redefinição de senha | Bruno Consultas',
            text: `Seu código de verificação é ${codigo}. Ele é válido por 10 minutos.`,
            html: html
        };

        // Envia a solicitação por HTTPS.
        // O fetch acompanha automaticamente o redirecionamento
        // utilizado pelo Google Apps Script para retornar o resultado.
        const resposta = await fetch(urlScript, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados),
            redirect: 'follow',
            signal: AbortSignal.timeout(30000)
        });

        const conteudo = await resposta.text();

        let resultado;

        try {
            resultado = JSON.parse(conteudo);
        } catch {
            throw new Error(
                'O Google Apps Script não retornou uma resposta JSON válida. ' +
                'Confira a implantação e as permissões do aplicativo.'
            );
        }

        if (!resposta.ok || !resultado.sucesso) {
            throw new Error(
                resultado.mensagem || 'O Google não conseguiu enviar o e-mail.'
            );
        }

        console.log('E-mail enviado com sucesso pelo Google Apps Script.');

        return resultado;

    } catch (erro) {
        console.error('ERRO AO ENVIAR E-MAIL:', erro.message);
        throw erro;
    }
}

export default enviar_email;
