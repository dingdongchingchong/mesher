import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getUserById } from "./db.js";

export type AuthRequest = Request & { userId?: number };

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = header.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: "Server misconfigured" });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as { userId: number };
    const user = getUserById(payload.userId);
    if (!user) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    req.userId = user.id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function signToken(userId: number): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");
  return jwt.sign({ userId }, secret, { expiresIn: "7d" });
}
