import mongoose from "mongoose";

const strokeSchema = new mongoose.Schema(
  {
    strokeId: String,
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room"
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    color: String,
    width: Number,
    points: [
      {
        x: Number,
        y: Number
      }
    ],
    
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export default mongoose.model("Stroke", strokeSchema);