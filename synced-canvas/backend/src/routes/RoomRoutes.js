import express from "express";
import { protect } from "../middleware/AuthMiddleware.js";
import { createRoom } from "../controllers/RoomController.js";
import { createRoomSchema } from "../validation/RoomValidation.js";
import { validate } from "../middleware/Validate.js";


const router = express.Router();

router.post("/create", protect, validate(createRoomSchema), createRoom);

export default router;