import { Router } from "express";
import { z } from "zod";
import { signToken } from "../auth.js";
import { createUser, getUserByEmail, verifyPassword } from "../db.js";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(6).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/register", (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { email, name, password } = parsed.data;

  if (getUserByEmail(email)) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const user = createUser(email, name, password);
  const token = signToken(user.id);

  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
});

authRouter.post("/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email or password" });
    return;
  }

  const { email, password } = parsed.data;
  const user = getUserByEmail(email);

  if (!user || !verifyPassword(user, password)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken(user.id);

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
});
