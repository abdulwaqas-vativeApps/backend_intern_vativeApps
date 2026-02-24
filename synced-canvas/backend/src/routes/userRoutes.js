import express from "express";
import { signup, login } from "../controllers/UserController.js";
import { validate } from "../middleware/Validate.js";
import { signupSchema, loginSchema } from "../validation/UserValidation.js";

const router = express.Router();

router.post("/register", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);

export default router;