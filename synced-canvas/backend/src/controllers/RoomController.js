import Room from "../models/Room.js";
import { ApiError } from "../utils/ApiError.js";
import { sendResponse } from "../utils/SendResponse.js";

export const createRoom = async (req, res, next) => {
  const { name } = req.validatedData;
  try {

    const existing = await Room.findOne({ name });
    if (existing) {
      throw new ApiError(400, "Room name already exists");
    }
    const room = await Room.create({
      name,
      createdBy: req.user.id,
    });

    return sendResponse(res, 201, "Room created", room);
  } catch (err) {
    next(err);
  }
};
