const express = require("express");
const mongoose = require("mongoose");
const { check, validationResult } = require("express-validator");
const isAuth = require("../middleware/isAuth");

const Post = mongoose.model("Post");
const User = mongoose.model("User");
const router = express.Router();

//@route      GET /api/v1/posts
//@desc       Gets all posts
//@access     Private
router.get("/", isAuth, async (req, res) => {
  try {
    const allPosts = await Post.find({ approved: true, approvalPending: false })
      .populate("user", "name image")
      .sort({ createdAt: -1 });

    res.send(allPosts);
  } catch (err) {
    return res.status(500).send({ msg: "Server Error" });
  }
});

//@route      POST /api/v1/posts
//@desc       Creates a post
//@access     Private
router.post(
  "/",
  isAuth,
  check("text", "Text is required").notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send({ errors: errors.array() });
    }

    try {
      const { id } = req.user;
      const { text } = req.body;
      const newPost = new Post({
        user: id,
        text,
      });

      const post = await newPost.save();

      //finds the user in the db and pushes the party.id into the created party array
      await User.findByIdAndUpdate(
        id,
        { $push: { posts: post.id } },
        { new: true }
      );

      res.send(post);
    } catch (err) {
      return res.status(500).send({ msg: "Server Error" });
    }
  }
);

module.exports = router;
