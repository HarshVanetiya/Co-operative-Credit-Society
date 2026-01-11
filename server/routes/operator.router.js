import express from "express";
import { login, verifyToken } from "../controller/operator.controller.js";
import { validateBody } from "../middleware/validate.js";
import { loginSchema } from "../lib/validators.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.post("/login", validateBody(loginSchema), login);
router.get("/verify", authMiddleware, verifyToken);

export default router;
