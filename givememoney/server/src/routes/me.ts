import { Router } from "express";
import type { AuthRequest } from "../auth.js";
import { authMiddleware } from "../auth.js";
import { getUserById } from "../db.js";

export const meRouter = Router();
meRouter.use(authMiddleware);

meRouter.get("/", (req: AuthRequest, res) => {
  const user = getUserById(req.userId!);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user });
});
