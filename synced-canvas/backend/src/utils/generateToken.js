import jwt from "jsonwebtoken";

export const generateToken = (user) => {
  console.log("process.env.JWT_SECRET =========:", process.env.JWT_SECRET);
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      email: user.email
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );
};