import { Router } from "express";
import { z } from "zod";
import type { AuthRequest } from "../auth.js";
import { authMiddleware } from "../auth.js";
import {
  createContact,
  deleteContact,
  getContactById,
  getContactsByUser,
} from "../db.js";

export const contactsRouter = Router();
contactsRouter.use(authMiddleware);

const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(7).max(20).optional().or(z.literal("")),
});

contactsRouter.get("/", (req: AuthRequest, res) => {
  const contacts = getContactsByUser(req.userId!);
  res.json({ contacts });
});

contactsRouter.post("/", (req: AuthRequest, res) => {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { name, email, phone } = parsed.data;
  if (!email && !phone) {
    res.status(400).json({ error: "Provide at least an email or phone number" });
    return;
  }

  const contact = createContact(req.userId!, name, email || null, phone || null);
  res.status(201).json({ contact });
});

contactsRouter.delete("/:id", (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid contact id" });
    return;
  }

  const deleted = deleteContact(req.userId!, id);
  if (!deleted) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  res.status(204).end();
});

contactsRouter.get("/:id", (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const contact = getContactById(id);
  if (!contact || contact.user_id !== req.userId) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }
  res.json({ contact });
});
