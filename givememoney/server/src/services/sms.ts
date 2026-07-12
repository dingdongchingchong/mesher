import twilio from "twilio";

export type SendSmsParams = {
  to: string;
  body: string;
};

function hasTwilioConfig() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER
  );
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  if (phone.startsWith("+")) return phone;
  return `+${digits}`;
}

export async function sendSms(params: SendSmsParams): Promise<{ ok: boolean; mode: string }> {
  const to = normalizePhone(params.to);

  if (!hasTwilioConfig()) {
    console.log("\n--- [DEV SMS] ---");
    console.log(`To: ${to}`);
    console.log(params.body);
    console.log("--- end sms ---\n");
    return { ok: true, mode: "console" };
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
  await client.messages.create({
    from: process.env.TWILIO_FROM_NUMBER!,
    to,
    body: params.body,
  });

  return { ok: true, mode: "twilio" };
}

export function buildMoneyRequestSms(opts: {
  senderName: string;
  amount: string;
  message: string;
  paymentLink?: string | null;
}) {
  const { senderName, amount, message, paymentLink } = opts;
  let body = `💸 ${senderName} is asking you for ${amount}.\n\n${message}`;
  if (paymentLink) {
    body += `\n\nPay: ${paymentLink}`;
  }
  body += "\n\n— GiveMeMoney";
  return body.slice(0, 1600);
}
