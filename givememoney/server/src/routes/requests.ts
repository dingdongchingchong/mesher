import { Router } from "express";
import { z } from "zod";
import type { AuthRequest } from "../auth.js";
import { authMiddleware } from "../auth.js";
import {
  createMoneyRequest,
  getContactById,
  getContactsByUser,
  getMoneyRequestById,
  getMoneyRequestsByUser,
  getUserById,
  markContactMessaged,
  renderMessageTemplate,
  updateMoneyRequestSent,
} from "../db.js";
import { buildMoneyRequestEmail, sendEmail } from "../services/email.js";
import { buildMoneyRequestSms, sendSms } from "../services/sms.js";

export const requestsRouter = Router();
requestsRouter.use(authMiddleware);

const requestSchema = z.object({
  contactId: z.number().int().positive(),
  amountCents: z.number().int().positive().max(100_000_000).optional(),
  message: z.string().min(1).max(2000).optional(),
  paymentLink: z.string().url().optional().or(z.literal("")),
  sendEmail: z.boolean().default(true),
  sendSms: z.boolean().default(false),
});

const bulkSchema = z.object({
  method: z.enum(["email", "sms", "both"]).default("email"),
  contactIds: z.array(z.number().int().positive()).optional(),
  amountCents: z.number().int().positive().max(100_000_000).optional(),
  message: z.string().min(1).max(2000).optional(),
  paymentLink: z.string().url().optional().or(z.literal("")),
});

function formatAmount(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

async function deliverRequest(opts: {
  userId: number;
  contactId: number;
  amountCents: number;
  message: string;
  paymentLink: string | null;
  doEmail: boolean;
  doSms: boolean;
}) {
  const contact = getContactById(opts.contactId);
  if (!contact || contact.user_id !== opts.userId) {
    throw Object.assign(new Error("Contact not found"), { status: 404 });
  }

  if (opts.doEmail && !contact.email) {
    throw Object.assign(new Error(`Contact ${contact.name} has no email`), {
      status: 400,
    });
  }
  if (opts.doSms && !contact.phone) {
    throw Object.assign(new Error(`Contact ${contact.name} has no phone`), {
      status: 400,
    });
  }
  if (!opts.doEmail && !opts.doSms) {
    throw Object.assign(new Error("Choose at least email or SMS"), {
      status: 400,
    });
  }

  const user = getUserById(opts.userId)!;
  const amount = formatAmount(opts.amountCents);
  const personalized = renderMessageTemplate(opts.message, {
    name: contact.name,
    amount,
    sender: user.name,
  });

  const moneyRequest = createMoneyRequest(
    opts.userId,
    opts.contactId,
    opts.amountCents,
    personalized,
    opts.paymentLink
  );

  let emailSent = false;
  let smsSent = false;
  const errors: string[] = [];

  try {
    if (opts.doEmail && contact.email) {
      const emailContent = buildMoneyRequestEmail({
        senderName: user.name,
        recipientName: contact.name,
        amount,
        message: personalized,
        paymentLink: opts.paymentLink,
      });
      await sendEmail({ to: contact.email, ...emailContent });
      emailSent = true;
    }

    if (opts.doSms && contact.phone) {
      const smsBody = buildMoneyRequestSms({
        senderName: user.name,
        amount,
        message: personalized,
        paymentLink: opts.paymentLink,
      });
      await sendSms({ to: contact.phone, body: smsBody });
      smsSent = true;
    }

    updateMoneyRequestSent(moneyRequest.id, emailSent, smsSent, "sent");
    if (emailSent || smsSent) markContactMessaged(contact.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Send failed";
    errors.push(msg);
    updateMoneyRequestSent(moneyRequest.id, emailSent, smsSent, "failed");
  }

  return {
    request: getMoneyRequestById(moneyRequest.id)!,
    contact,
    emailSent,
    smsSent,
    errors,
  };
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

  const user = getUserById(req.userId!)!;
  const {
    contactId,
    amountCents,
    message,
    paymentLink,
    sendEmail: doEmail,
    sendSms: doSms,
  } = parsed.data;

  try {
    const result = await deliverRequest({
      userId: req.userId!,
      contactId,
      amountCents: amountCents ?? user.target_amount_cents,
      message: message ?? user.message_template,
      paymentLink: paymentLink || user.payment_link,
      doEmail,
      doSms,
    });

    if (result.errors.length > 0 && !result.emailSent && !result.smsSent) {
      res.status(502).json({
        error: result.errors.join("; "),
        request: result.request,
      });
      return;
    }

    res.status(201).json({
      request: result.request,
      emailSent: result.emailSent,
      smsSent: result.smsSent,
      warnings: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (err) {
    const status = (err as { status?: number }).status || 500;
    res
      .status(status)
      .json({ error: err instanceof Error ? err.message : "Send failed" });
  }
});

/** Bulk send to all (or selected) contacts — matches PDF /api/send-requests flow */
requestsRouter.post("/send-all", async (req: AuthRequest, res) => {
  const parsed = bulkSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const user = getUserById(req.userId!)!;
  const { method, contactIds, amountCents, message, paymentLink } = parsed.data;
  const doEmail = method === "email" || method === "both";
  const doSms = method === "sms" || method === "both";

  let contacts = getContactsByUser(req.userId!);
  if (contactIds?.length) {
    const idSet = new Set(contactIds);
    contacts = contacts.filter((c) => idSet.has(c.id));
  }

  if (contacts.length === 0) {
    res.status(400).json({ error: "No contacts to message" });
    return;
  }

  const results: Array<{
    contactId: number;
    contactName: string;
    ok: boolean;
    emailSent: boolean;
    smsSent: boolean;
    error?: string;
  }> = [];

  for (const contact of contacts) {
    const canEmail = doEmail && Boolean(contact.email);
    const canSms = doSms && Boolean(contact.phone);

    if (!canEmail && !canSms) {
      results.push({
        contactId: contact.id,
        contactName: contact.name,
        ok: false,
        emailSent: false,
        smsSent: false,
        error: "No matching channel for this contact",
      });
      continue;
    }

    try {
      const result = await deliverRequest({
        userId: req.userId!,
        contactId: contact.id,
        amountCents: amountCents ?? user.target_amount_cents,
        message: message ?? user.message_template,
        paymentLink: paymentLink || user.payment_link,
        doEmail: canEmail,
        doSms: canSms,
      });

      const ok = result.emailSent || result.smsSent;
      results.push({
        contactId: contact.id,
        contactName: contact.name,
        ok,
        emailSent: result.emailSent,
        smsSent: result.smsSent,
        error: result.errors[0],
      });
    } catch (err) {
      results.push({
        contactId: contact.id,
        contactName: contact.name,
        ok: false,
        emailSent: false,
        smsSent: false,
        error: err instanceof Error ? err.message : "Failed",
      });
    }
  }

  const sent = results.filter((r) => r.ok).length;
  res.json({
    sent,
    failed: results.length - sent,
    results,
  });
});
