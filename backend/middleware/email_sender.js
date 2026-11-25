
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

async function enviar_email(email_usuario, codigo) {

    const emailRemetente = process.env.EMAIL_USER || 'bruno.consultas.auth@gmail.com';

    if (!process.env.EMAIL_PASSWORD) {
        throw new Error('EMAIL_PASSWORD não foi configurado no arquivo .env');
    }

    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: emailRemetente,
            pass: process.env.EMAIL_PASSWORD
        }
    });

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

    const mailOptions = {
        from: `"Bruno Consultas" <${emailRemetente}>`,
        to: email_usuario,
        subject: 'Redefinição de senha | Bruno Consultas',
        text: `Seu código de verificação é ${codigo}. Ele é válido por 10 minutos.`,
        html
    };

    // Agora a função aguarda o envio e retorna o resultado.
    const resultado = await transporter.sendMail(mailOptions);

    console.log('E-mail enviado:', resultado.messageId);

    return resultado;
}

export default enviar_email;
