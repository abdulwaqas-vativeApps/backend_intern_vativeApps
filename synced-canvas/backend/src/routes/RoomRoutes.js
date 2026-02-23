import express from "express";
import { protect } from "../middleware/AuthMiddleware";
import { createRoom } from "../controllers/RoomController";
import { createRoomSchema } from "../validation/RoomValidation";
import { validate } from "../middleware/Validate";


const router = express.Router();

router.post("/create", protect, validate(createRoomSchema), createRoom);

export default router;