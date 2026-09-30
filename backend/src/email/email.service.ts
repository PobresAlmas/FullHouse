import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
    private resend: Resend;

    constructor() {
        this.resend = new Resend(process.env.RESEND_API_KEY);
    }

    async sendResetPasswordEmail(email: string, code: string) {
        await this.resend.emails.send({
            from: "FullHouse <onboarding@resend.dev>",
            to: email,
            subject: "Código para redefinir sua senha",
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Recuperação de senha</title>
                </head>

                <body style="
                    margin:0;
                    padding:0;
                    background-color:#f5f7f6;
                    font-family:Arial, Helvetica, sans-serif;
                ">

                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td align="center" style="padding:40px 20px;">

                            <table
                                width="100%"
                                cellpadding="0"
                                cellspacing="0"
                                style="
                                    max-width:480px;
                                    background:white;
                                    border-radius:16px;
                                    overflow:hidden;
                                    box-shadow:0 4px 12px rgba(0,0,0,0.08);
                                "
                            >

                                <tr>
                                    <td
                                        align="center"
                                        style="
                                            background:#2E7D32;
                                            padding:32px;
                                        "
                                    >
                                        <h1
                                            style="
                                                color:white;
                                                margin:0;
                                                font-size:28px;
                                            "
                                        >
                                            FullHouse
                                        </h1>

                                        <p
                                            style="
                                                color:#d9f2dc;
                                                margin:8px 0 0;
                                                font-size:14px;
                                            "
                                        >
                                            Organização para sua casa
                                        </p>
                                    </td>
                                </tr>


                                <tr>
                                    <td
                                        style="
                                            padding:32px;
                                            color:#333;
                                        "
                                    >

                                        <h2
                                            style="
                                                margin-top:0;
                                                color:#222;
                                                font-size:22px;
                                            "
                                        >
                                            Esqueceu sua senha?
                                        </h2>


                                        <p
                                            style="
                                                font-size:16px;
                                                line-height:1.5;
                                                color:#555;
                                            "
                                        >
                                            Recebemos uma solicitação para redefinir
                                            sua senha. Use o código abaixo para continuar:
                                        </p>


                                        <div
                                            style="
                                                margin:32px 0;
                                                padding:20px;
                                                background:#E8F5E9;
                                                border-radius:12px;
                                                text-align:center;
                                            "
                                        >

                                            <span
                                                style="
                                                    display:block;
                                                    font-size:12px;
                                                    color:#555;
                                                    margin-bottom:8px;
                                                "
                                            >
                                                CÓDIGO DE VERIFICAÇÃO
                                            </span>


                                            <strong
                                                style="
                                                    font-size:36px;
                                                    letter-spacing:8px;
                                                    color:#2E7D32;
                                                "
                                            >
                                                ${code}
                                            </strong>

                                        </div>


                                        <p
                                            style="
                                                font-size:14px;
                                                color:#777;
                                                line-height:1.5;
                                            "
                                        >
                                            Esse código expira em 15 minutos.
                                            Caso você não tenha solicitado essa alteração,
                                            ignore este email.
                                        </p>

                                    </td>
                                </tr>


                                <tr>
                                    <td
                                        align="center"
                                        style="
                                            padding:20px;
                                            background:#fafafa;
                                            color:#999;
                                            font-size:12px;
                                        "
                                    >
                                        © FullHouse. Todos os direitos reservados.
                                    </td>
                                </tr>

                            </table>

                        </td>
                    </tr>
                </table>

                </body>
                </html>
            `
        });
    }
}
