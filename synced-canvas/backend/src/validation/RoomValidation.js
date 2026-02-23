import Joi from "joi";

export const createRoomSchema = Joi.object({
  name: Joi.string().min(3).max(50).required().messages({
    "string.empty": "Room name is required",
    "string.min": "Room name should have at least 3 characters",
    "string.max": "Room name should have max 50 characters",
  }),
});