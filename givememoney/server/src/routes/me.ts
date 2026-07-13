import { Router } from "express";
import { z } from "zod";
import type { AuthRequest } from "../auth.js";
import { authMiddleware } from "../auth.js";
import { getUserById, getUserStats, updateUserSettings } from "../db.js";

export const meRouter = Router();
meRouter.use(authMiddleware);

meRouter.get("/", (req: AuthRequest, res) => {
  const user = getUserById(req.userId!);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      messageTemplate: user.message_template,
      targetAmountCents: user.target_amount_cents,
      paymentLink: user.payment_link,
      createdAt: user.created_at,
    },
  });
});

const settingsSchema = z.object({
  messageTemplate: z.string().min(1).max(2000).optional(),
  targetAmountCents: z.number().int().positive().max(100_000_000).optional(),
  targetAmount: z.number().positive().max(1_000_000).optional(),
  paymentLink: z.string().url().optional().or(z.literal("")).nullable(),
});

meRouter.put("/settings", (req: AuthRequest, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { messageTemplate, targetAmountCents, targetAmount, paymentLink } =
    parsed.data;

  let cents = targetAmountCents;
  if (cents === undefined && targetAmount !== undefined) {
    cents = Math.round(targetAmount * 100);
  }

  const user = updateUserSettings(req.userId!, {
    messageTemplate,
    targetAmountCents: cents,
    paymentLink:
      paymentLink === "" || paymentLink === null ? null : paymentLink,
  });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      messageTemplate: user.message_template,
      targetAmountCents: user.target_amount_cents,
      paymentLink: user.payment_link,
    },
  });
});

export const statsRouter = Router();
statsRouter.use(authMiddleware);

statsRouter.get("/", (req: AuthRequest, res) => {
  res.json(getUserStats(req.userId!));
});
