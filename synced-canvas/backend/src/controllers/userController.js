import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/GenerateToken.js";
import { sendResponse } from "../utils/SendResponse.js";
import { ApiError } from "../utils/ApiError.js";

export const signup = async (req, res, next) => {
  try {
    const { username, email, password } = req.validatedData;

    // check existing
    const existing = await User.findOne({ email });
    if (existing) return next(new ApiError(400, "Email already registered"));

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    const token = generateToken(newUser);

    return sendResponse(res, 201, "User created successfully", {
      token,
      user: { id: newUser._id, username, email },
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.validatedData;

    const user = await User.findOne({ email });
    if (!user) return next(new ApiError(400, "Invalid credentials"));

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return next(new ApiError(400, "Invalid credentials"));

    const token = generateToken(user);

    return sendResponse(res, 200, "Login successful", {
      token,
      user: { id: user._id, username: user.username, email },
    });
  } catch (err) {
    next(err);
  }
};