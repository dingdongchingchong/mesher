import { Router } from "express";
import { z } from "zod";
import type { AuthRequest } from "../auth.js";
import { authMiddleware } from "../auth.js";
import {
  createMoneyRequest,
  getContactById,
  getMoneyRequestsByUser,
  getMoneyRequestById,
  getUserById,
  updateMoneyRequestSent,
} from "../db.js";
import { buildMoneyRequestEmail, sendEmail } from "../services/email.js";
import { buildMoneyRequestSms, sendSms } from "../services/sms.js";

export const requestsRouter = Router();
requestsRouter.use(authMiddleware);

const requestSchema = z.object({
  contactId: z.number().int().positive(),
  amountCents: z.number().int().positive().max(100_000_000),
  message: z.string().min(1).max(2000),
  paymentLink: z.string().url().optional().or(z.literal("")),
  sendEmail: z.boolean().default(true),
  sendSms: z.boolean().default(true),
});

function formatAmount(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

requestsRouter.get("/", (req: AuthRequest, res) => {
  const requests = getMoneyRequestsByUser(req.userId!);
  res.json({ requests });
});

requestsRouter.post("/", async (req: AuthRequest, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { contactId, amountCents, message, paymentLink, sendEmail: doEmail, sendSms: doSms } =
    parsed.data;

  const contact = getContactById(contactId);
  if (!contact || contact.user_id !== req.userId) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  if (doEmail && !contact.email) {
    res.status(400).json({ error: "Contact has no email address" });
    return;
  }
  if (doSms && !contact.phone) {
    res.status(400).json({ error: "Contact has no phone number" });
    return;
  }
  if (!doEmail && !doSms) {
    res.status(400).json({ error: "Choose at least email or SMS" });
    return;
  }

  const user = getUserById(req.userId!)!;
  const amount = formatAmount(amountCents);
  const link = paymentLink || null;

  const moneyRequest = createMoneyRequest(
    req.userId!,
    contactId,
    amountCents,
    message,
    link
  );

  let emailSent = false;
  let smsSent = false;
  const errors: string[] = [];

  try {
    if (doEmail && contact.email) {
      const emailContent = buildMoneyRequestEmail({
        senderName: user.name,
        recipientName: contact.name,
        amount,
        message,
        paymentLink: link,
      });
      await sendEmail({
        to: contact.email,
        ...emailContent,
      });
      emailSent = true;
    }

    if (doSms && contact.phone) {
      const smsBody = buildMoneyRequestSms({
        senderName: user.name,
        amount,
        message,
        paymentLink: link,
      });
      await sendSms({ to: contact.phone, body: smsBody });
      smsSent = true;
    }

    updateMoneyRequestSent(moneyRequest.id, emailSent, smsSent, "sent");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Send failed";
    errors.push(msg);
    updateMoneyRequestSent(moneyRequest.id, emailSent, smsSent, "failed");
  }

  const updated = getMoneyRequestById(moneyRequest.id)!;

  if (errors.length > 0 && !emailSent && !smsSent) {
    res.status(502).json({ error: errors.join("; "), request: updated });
    return;
  }

  res.status(201).json({
    request: updated,
    emailSent,
    smsSent,
    warnings: errors.length > 0 ? errors : undefined,
  });
});
