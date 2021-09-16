const express = require("express");
const mongoose = require("mongoose");
const isAuth = require("../middleware/isAuth");
const { check, validationResult } = require("express-validator");

const User = mongoose.model("User");
const Post = mongoose.model("Post");

const router = express.Router();

//@route      GET /api/v1/users
//@desc       Gets a list of all users
//@access     Private
router.get("/", isAuth, async (req, res) => {
  try {
    //gets all user in the DB removes password field from object
    const allUsers = await User.find().select("-password");
    res.send(allUsers);
  } catch (err) {
    return res.status(500).send({ msg: "Server Error" });
  }
});

//@route      GET /api/v1/users/:id
//@desc       Gets user by id
//@access     Private
router.get("/:id", isAuth, async (req, res) => {
  try {
    // gets id from params
    const { id } = req.params;
    //id validity check
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ msg: "ID Not Valid" });
    }
    //finds the user based on the id passed in the params
    const user = await User.findById(id).select("-password");

    res.send(user);
  } catch (err) {
    return res.status(500).send({ msg: "Server Error" });
  }
});

//@route      GET /api/v1/users/me
//@desc       Gets the current user infos
//@access     Private
router.get("/me", isAuth, async (req, res) => {
  try {
    const { id } = req.user;
    const user = await User.findById(id).select("-password");

    res.send(user);
  } catch (err) {
    return res.status(500).send({ msg: "Server Error" });
  }
});

//@route      GET /api/v1/users/:id/posts
//@desc       Gets user posts
//@access     Private
router.get("/:id/posts", isAuth, async (req, res) => {
  try {
    // gets id from params
    const { id } = req.params;
    //id validity check
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ msg: "ID Not Valid" });
    }
    //finds the user based on the id passed in the params
    const user = await User.findById(id).select("-password");

    //gets the hosting based on the ID's in the user with the id from params hosting array
    const posts = await Post.find({
      _id: { $in: user.posts },
    }).populate("user", "username image");

    res.send(posts);
  } catch (error) {
    return res.status(500).send({ msg: "Server Error" });
  }
});

module.exports = router;
