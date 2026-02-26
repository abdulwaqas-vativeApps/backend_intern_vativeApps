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
    let room = await Room.create({
      name,
      createdBy: req.user.id,
    });

    room = await room.populate("createdBy", "username email");

    return sendResponse(res, 201, "Room created", room);
  } catch (err) {
    next(err);
  }
};

export const getAllRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find()
      .populate("createdBy", "username email");

    if (!rooms) {
      throw new ApiError(404, "No rooms found");
    }

    return sendResponse(res, 201, "Rooms fetched successfully", rooms);
  } catch (err) {
    next(err);
  }
};
