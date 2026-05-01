function formatCurrency(value) {
  const num = Number(value || 0);
  return (
    "R$ " +
    num
      .toFixed(2)
      .replace(".", ",")
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  );
}

function formatPaymentMethod(method) {
  const map = {
    checkout_pro: "MercadoPago",
    pix: "PIX",
    credit: "Cartão de Crédito",
    debit: "Cartão de Débito",
    boleto: "Boleto Bancário",
    manual: "Pagamento Manual",
  };
  return map[String(method || "")] || String(method || "") || "—";
}

function baseLayout(bodyContent) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>ESDRA Aromas</title>
</head>
<body style="margin:0;padding:0;background-color:#f7f2eb;-webkit-text-size-adjust:100%;mso-line-height-rule:exactly;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f7f2eb;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;">

          <!-- Header -->
          <tr>
            <td style="background-color:#fffdf9;border-radius:6px 6px 0 0;padding:32px 40px 24px;border-bottom:2px solid #b8a07e;">
              <p style="margin:0;font-size:18px;font-weight:700;letter-spacing:7px;color:#2a221d;text-transform:uppercase;font-family:Georgia,'Times New Roman',serif;">ESDRA</p>
              <p style="margin:4px 0 0;font-size:9px;letter-spacing:4px;color:#74685d;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">AROMAS</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#fffdf9;padding:36px 40px;">
              ${bodyContent}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#fffdf9;border-radius:0 0 6px 6px;padding:20px 40px 28px;border-top:1px solid #e4d8cb;">
              <p style="margin:0;font-size:11px;color:#74685d;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
                Este email foi enviado automaticamente — por favor, não responda.<br>
                &copy; ${year} ESDRA Aromas. Todos os direitos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Builds the email content ({ subject, html }) for a given emailQueue document.
 *
 * @param {{
 *   type: string,
 *   customerName: string,
 *   orderNumber: string,
 *   total: number,
 *   paymentMethod: string,
 *   appUrl: string
 * }} opts
 * @returns {{ subject: string, html: string } | null}
 */
export function buildEmail({type, customerName, orderNumber, total, paymentMethod, appUrl}) {
  const firstName = String(customerName || "").split(" ")[0] || "Cliente";
  const formattedTotal = formatCurrency(total);
  const formattedMethod = formatPaymentMethod(paymentMethod);
  const orderUrl = `${String(appUrl || "").replace(/\/$/, "")}/account/orders`;

  if (type === "order_confirmation") {
    return {
      subject: `Pedido #${orderNumber} recebido — ESDRA Aromas`,
      html: baseLayout(`
        <p style="margin:0 0 6px;font-size:11px;color:#74685d;text-transform:uppercase;letter-spacing:2px;font-family:Arial,Helvetica,sans-serif;">Olá, ${firstName}</p>
        <h1 style="margin:0 0 28px;font-size:22px;color:#2a221d;font-weight:normal;font-family:Georgia,'Times New Roman',serif;">Seu pedido foi recebido.</h1>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8f2ea;border-radius:4px;margin-bottom:28px;">
          <tr>
            <td style="padding:20px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:top;">
                    <p style="margin:0 0 3px;font-size:10px;color:#74685d;text-transform:uppercase;letter-spacing:1.5px;font-family:Arial,Helvetica,sans-serif;">Pedido</p>
                    <p style="margin:0;font-size:17px;font-weight:700;color:#2a221d;font-family:Arial,Helvetica,sans-serif;">#${orderNumber}</p>
                  </td>
                  <td align="right" style="vertical-align:top;">
                    <p style="margin:0 0 3px;font-size:10px;color:#74685d;text-transform:uppercase;letter-spacing:1.5px;font-family:Arial,Helvetica,sans-serif;">Total</p>
                    <p style="margin:0;font-size:17px;font-weight:700;color:#2a221d;font-family:Arial,Helvetica,sans-serif;">${formattedTotal}</p>
                  </td>
                </tr>
                ${paymentMethod ? `
                <tr>
                  <td colspan="2" style="padding-top:14px;border-top:1px solid #e4d8cb;">
                    <p style="margin:0;font-size:12px;color:#74685d;font-family:Arial,Helvetica,sans-serif;">Forma de pagamento: <strong style="color:#4b3f35;">${formattedMethod}</strong></p>
                  </td>
                </tr>` : ""}
              </table>
            </td>
          </tr>
        </table>

        <p style="margin:0 0 28px;font-size:14px;line-height:1.8;color:#4b3f35;font-family:Arial,Helvetica,sans-serif;">
          Obrigado pela compra! Assim que o pagamento for confirmado você receberá outro email e o status do pedido será atualizado automaticamente.
        </p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="border-radius:4px;background-color:#7f6348;">
              <a href="${orderUrl}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:13px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.5px;font-family:Arial,Helvetica,sans-serif;">Acompanhar pedido &rarr;</a>
            </td>
          </tr>
        </table>
      `),
    };
  }

  if (type === "payment_approved") {
    return {
      subject: `Pagamento confirmado — Pedido #${orderNumber}`,
      html: baseLayout(`
        <p style="margin:0 0 6px;font-size:11px;color:#74685d;text-transform:uppercase;letter-spacing:2px;font-family:Arial,Helvetica,sans-serif;">Olá, ${firstName}</p>
        <h1 style="margin:0 0 28px;font-size:22px;color:#2a221d;font-weight:normal;font-family:Georgia,'Times New Roman',serif;">Pagamento confirmado.</h1>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0fdf4;border-radius:4px;border-left:3px solid #2e6f4e;margin-bottom:24px;">
          <tr>
            <td style="padding:14px 18px;">
              <p style="margin:0;font-size:13px;color:#166534;font-family:Arial,Helvetica,sans-serif;">&#10003; &nbsp;Seu pagamento foi aprovado com sucesso.</p>
            </td>
          </tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8f2ea;border-radius:4px;margin-bottom:28px;">
          <tr>
            <td style="padding:20px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:top;">
                    <p style="margin:0 0 3px;font-size:10px;color:#74685d;text-transform:uppercase;letter-spacing:1.5px;font-family:Arial,Helvetica,sans-serif;">Pedido</p>
                    <p style="margin:0;font-size:17px;font-weight:700;color:#2a221d;font-family:Arial,Helvetica,sans-serif;">#${orderNumber}</p>
                  </td>
                  <td align="right" style="vertical-align:top;">
                    <p style="margin:0 0 3px;font-size:10px;color:#74685d;text-transform:uppercase;letter-spacing:1.5px;font-family:Arial,Helvetica,sans-serif;">Total pago</p>
                    <p style="margin:0;font-size:17px;font-weight:700;color:#2a221d;font-family:Arial,Helvetica,sans-serif;">${formattedTotal}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <p style="margin:0 0 28px;font-size:14px;line-height:1.8;color:#4b3f35;font-family:Arial,Helvetica,sans-serif;">
          Estamos preparando seu pedido para envio. Você receberá atualizações de status diretamente na sua conta.
        </p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="border-radius:4px;background-color:#7f6348;">
              <a href="${orderUrl}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:13px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.5px;font-family:Arial,Helvetica,sans-serif;">Ver meu pedido &rarr;</a>
            </td>
          </tr>
        </table>
      `),
    };
  }

  return null;
}
