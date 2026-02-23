import Room from "../models/Room.js";
import { sendResponse } from "../utils/SendResponse.js";

export const createRoom = async (req, res, next) => {
  const { name } = req.validatedData;
  try {
    const room = await Room.create({
      name,
      createdBy: req.user.id,
    });

    return sendResponse(res, 201, "Room created", room);
  } catch (err) {
    next(err);
  }
};
