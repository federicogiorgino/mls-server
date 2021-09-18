const express = require("express");
const mongoose = require("mongoose");
const isAuth = require("../middleware/isAuth");
const isAdmin = require("../middleware/isAdmin");

const Post = mongoose.model("Post");
const User = mongoose.model("User");
const router = express.Router();

//@route      GET /api/v1/admin/posts/pending
//@desc       Gets all pending posts
//@access     Private/Admin
router.get("/posts/pending", [isAuth, isAdmin], async (req, res) => {
  try {
    //finds all posts with properties {approved: false, approvalPending: true}
    const allPendingPosts = await Post.find({
      approved: false,
      approvalPending: true,
    })
      .populate("user", "username image")
      .sort({ createdAt: -1 });

    res.send(allPendingPosts);
  } catch (err) {
    return res.status(500).send({ msg: "Server Error" });
  }
});

//@route      PUT /api/v1/admin/posts/:id/approve
//@desc       Approves a pending post
//@access     Private
router.put("/posts/:id/approve", [isAuth, isAdmin], async (req, res) => {
  try {
    const { id } = req.params;
    //ID Validity Check
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ msg: "ID Not Valid" });
    }
    //finds the post in the db
    const post = await Post.findById(id);
    //check if the post exist
    if (!post) {
      return res.status(404).send({ msg: "Post not found" });
    }
    //check if post is pending an approval
    if (!post.approvalPending) {
      return res.status(404).send({ msg: "Post already approved" });
    }
    //updated the post with the property approved: true, approvalPending: false
    await Post.findByIdAndUpdate(
      id,
      {
        approved: true,
        approvalPending: false,
        createdAt: Date.now,
      },
      { new: true }
    );
    //pushes the Post ID into the post creator posts array
    await User.findByIdAndUpdate(
      post.user,
      { $push: { posts: post.id } },
      { new: true }
    );

    res.send({ msg: "Post approved successfully" });
  } catch (err) {
    return res.status(500).send({ msg: "Server Error" });
  }
});

//@route      PUT /api/v1/admin/posts/:id/reject
//@desc       Rejects a pending post
//@access     Private
router.put("/posts/:id/reject", isAuth, async (req, res) => {
  try {
    const { id } = req.params;
    //ID validity check
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ msg: "ID Not Valid" });
    }
    //finds the post in the db
    const post = await Post.findById(id);
    //check if the post exist
    if (!post) {
      return res.status(404).send({ msg: "Post not found" });
    }
    //check if post is pending an approval
    if (!post.approvalPending) {
      return res.status(404).send({ msg: "Post already rejected" });
    }
    //removes the post from the db
    await post.remove();

    res.send({ msg: "Post rejected successfully" });
  } catch (err) {
    return res.status(500).send({ msg: "Server Error" });
  }
});

module.exports = router;
