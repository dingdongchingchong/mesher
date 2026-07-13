import nodemailer from "nodemailer";

export type SendEmailParams = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function hasSmtpConfig() {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendEmail(
  params: SendEmailParams
): Promise<{ ok: boolean; mode: string }> {
  const from = process.env.SMTP_FROM || "noreply@givememoney.app";

  if (!hasSmtpConfig()) {
    console.log("\n--- [DEV EMAIL] ---");
    console.log(`From: ${from}`);
    console.log(`To: ${params.to}`);
    console.log(`Subject: ${params.subject}`);
    console.log(params.text);
    console.log("--- end email ---\n");
    return { ok: true, mode: "console" };
  }

  await getTransporter().sendMail({
    from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });

  return { ok: true, mode: "smtp" };
}

export function buildMoneyRequestEmail(opts: {
  senderName: string;
  recipientName: string;
  amount: string;
  message: string;
  paymentLink?: string | null;
}) {
  const { senderName, recipientName, amount, message, paymentLink } = opts;
  const subject = `${senderName} is asking you for ${amount}`;

  const paymentBlock = paymentLink
    ? `\n\nPay here: ${paymentLink}`
    : "\n\nPlease reply to this email to arrange payment.";

  const text = `Hi ${recipientName},

${senderName} is reaching out to ask for ${amount}.

${message}${paymentBlock}

— Sent via GiveMeMoney`;

  const html = `
    <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #14261C;">
      <p style="font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #5C7A68; margin: 0 0 8px;">GiveMeMoney</p>
      <h2 style="color: #0F3D2E; margin: 0 0 16px; font-weight: 600;">Money request</h2>
      <p>Hi ${escapeHtml(recipientName)},</p>
      <p><strong>${escapeHtml(senderName)}</strong> is asking you for <strong style="font-size: 1.25em;">${escapeHtml(amount)}</strong>.</p>
      <blockquote style="border-left: 3px solid #C4A35A; margin: 16px 0; padding: 12px 16px; background: #F4F7F2;">
        ${escapeHtml(message).replace(/\n/g, "<br>")}
      </blockquote>
      ${
        paymentLink
          ? `<p><a href="${escapeAttr(paymentLink)}" style="display:inline-block;background:#0F3D2E;color:#F7F3E8;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:600;">Send ${escapeHtml(amount)}</a></p>`
          : "<p>Please reply to arrange payment.</p>"
      }
      <p style="color:#6B7F72;font-size:12px;margin-top:32px;">Sent via GiveMeMoney</p>
    </div>
  `;

  return { subject, text, html };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value: string) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
