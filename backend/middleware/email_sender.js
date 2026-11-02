import nodemailer from "nodemailer";
import dotenv from 'dotenv';

dotenv.config();

const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Recuperação de senha | Bruno Consultas</title></head><body style="margin:0;padding:0;background-color:#f4f1f8;font-family:Arial,sans-serif;"><div style="background-color:#f4f1f8;padding:40px 20px;"><div style="background-color:#fff;max-width:500px;margin:0 auto;padding:35px;border-radius:12px;text-align:center;"><hr style="width:45px;border:2px solid #8700e8;margin:25px auto;"><h1 style="color:#26004d;font-size:25px;">Redefinição de senha</h1><p style="color:#716879;">Olá!</p><p style="color:#716879;font-size:14px;line-height:1.7;">Recebemos uma solicitação para redefinir a senha da sua conta Bruno Consultas. Para continuar, utilize o código de verificação abaixo.</p><div style="background-color:#f5eeff;padding:20px;border-radius:10px;margin:25px 0;"><p style="color:#7100c9;font-size:12px;font-weight:bold;">CÓDIGO DE VERIFICAÇÃO</p><h1 style="color:#310064;font-size:34px;letter-spacing:8px;">${codigo}</h1><p style="color:#877a91;font-size:12px;">Este código é válido por 10 minutos.</p></div><p style="color:#716879;font-size:13px;line-height:1.6;">Se você não solicitou a redefinição de senha, ignore este e-mail. Sua conta permanecerá segura.</p><hr style="border:none;border-top:1px solid #eee8f4;margin-top:25px;"><p style="color:#a198aa;font-size:12px;"><b>Bruno Consultas</b></p><p style="color:#b5adbd;font-size:10px;">Este é um e-mail automático. Por favor, não responda.</p></div></div></body></html>`;

function enviar_email(email_usuario, codigo) {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, 
        auth: {
            user: 'bruno.consultas.auth@gmail.com',
            pass: process.env.EMAIL_PASSWORD 
        }
    });

    // 2. Definir as opções da mensagem
    const mailOptions = {
        from: 'bruno.consultas.auth@gmail.com',
        to: email_usuario,
        subject: 'Redefinição de senha | Bruno Consultas',
        text: 'Olá! Utilize o código enviado para redefinir sua senha.',
        html: html,
    };

    // 3. Enviar o e-mail
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return { 'mensagem':'Erro'}
        }
        return {};
    });
}

export default enviar_email;