const mongoose = require("mongoose");

const { Schema } = mongoose;

const postSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  text: { type: String, required: true },
  likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
  agrees: [{ type: Schema.Types.ObjectId, ref: "User" }],
  deserves: [{ type: Schema.Types.ObjectId, ref: "User" }],
  comments: [
    {
      text: { type: String, require: true },
      user: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      username: { type: String, required: true },
      image: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  approved: { type: Boolean, default: false },
  approvalPending: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

mongoose.model("Post", postSchema);
