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
    const allPosts = await Post.find()
      .populate("user", "name image")
      .sort({ createdAt: -1 });

    res.send(allPosts);
  } catch (err) {
    return res.status(500).send({ msg: "Server Error" });
  }
});

module.exports = router;
