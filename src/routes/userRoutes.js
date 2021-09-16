const express = require("express");
const mongoose = require("mongoose");
const isAuth = require("../middleware/isAuth");
const { check, validationResult } = require("express-validator");

const User = mongoose.model("User");
const Post = mongoose.model("Post");

const router = express.Router();

//@route      GET /api/v1/user/me
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

module.exports = router;
