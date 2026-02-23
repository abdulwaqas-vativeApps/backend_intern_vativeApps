import express from "express";
import { signup, login } from "../controllers/userController.js";
import { validate } from "../middleware/validate.js";
import { signupSchema, loginSchema } from "../validation/userValidation.js";

const router = express.Router();

router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);

export default router;