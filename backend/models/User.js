import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["admin", "manager"],
    default: "manager",
  },
  mustChangePassword: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

export default mongoose.model("User", userSchema);
