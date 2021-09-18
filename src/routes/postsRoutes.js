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
    const allPosts = await Post.find({
      approved: true,
      approvalPending: false,
    })
      .populate("user", "username image")
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
    //express validator error handler
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send({ errors: errors.array() });
    }

    try {
      const { id } = req.user;
      const { text } = req.body;
      //create new post with the text from the req.body and the user from req.user.id
      const newPost = new Post({
        user: id,
        text,
      });
      //saves the post in the db
      const post = await newPost.save();

      res.send(post);
    } catch (err) {
      return res.status(500).send({ msg: "Server Error" });
    }
  }
);

//@route      GET /api/v1/posts/:id
//@desc       Gets one specific posts based on req.params.id
//@access     Private
router.get("/:id", isAuth, async (req, res) => {
  try {
    const { id } = req.params;
    //ID validity check
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ msg: "ID Not Valid" });
    }

    //finds post in the db based on req.params.id and than populates it
    const post = await Post.findById(id).populate("user", "username image");
    //check if post exists
    if (!post) {
      return res.status(404).send({ msg: "Post not found" });
    }
    //check if post still need to be approved
    if (post.approvalPending) {
      return res.status(404).send({ msg: "Post is pending approval" });
    }

    res.send(post);
  } catch (err) {
    return res.status(500).send({ msg: "Server Error" });
  }
});

//@route      DELETE /api/v1/posts/:id
//@desc       Deletes a post based on id if req.user === post.user
//@access     Private
router.delete("/:id", isAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId } = req.user;
    //ID validity check
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ msg: "ID Not Valid" });
    }
    //finds post in the db based on req.params.id
    const post = await Post.findById(id);
    //check if post exists
    if (!post) {
      return res.status(404).send({ msg: "Post Not Found" });
    }
    //checks if the id of the user making the delete request and the user who made the post match
    if (post.user.toString() !== userId) {
      return res.status(401).send({ msg: "User unauthorized" });
    }

    //we update all user (regardless of checking if they have had the post in their attending)
    //and remove the post id from the attending array
    await User.updateMany(
      {},
      { $pull: { likes: id, posts: id } },
      { new: true }
    );
    //removes the post
    await post.remove();
    res.send({ msg: "Post deleted successfully" });
  } catch (err) {
    return res.status(500).send({ msg: "Server Error" });
  }
});

//@route      PUT /api/v1/posts/:id/like
//@desc       Likes/Unlikes a post
//@access     Private
router.put("/:id/like", isAuth, async (req, res) => {
  try {
    //postId
    const { id } = req.params;
    const { id: userId } = req.user;
    //ID validity check
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ msg: "ID not valid" });
    }
    //finds the post in the db
    const post = await Post.findById(id);
    //check if post exist
    if (!post) {
      return res.status(404).send({ msg: "Post Not Found" });
    }
    //check if post is pending approval
    if (post.approvalPending) {
      return res.status(404).send({ msg: "Can't like pending posts" });
    }
    //checks if post is already liked by post.likes.some()
    if (post.likes.some((likesId) => likesId.toString() === userId)) {
      return res.status(400).send({ msg: "Post already liked" });
    }
    //unshifts the user id in the post likes array
    post.likes.unshift(userId);
    //updates the user (req.user) pushing the party id into his likes array
    await User.findByIdAndUpdate(
      userId,
      { $push: { likes: id } },
      { new: true }
    );

    await post.save();

    res.send(post.likes);
  } catch (err) {
    return res.status(500).send({ msg: "Server Error" });
  }
});

//@route      PUT /api/v1/posts/:id/unlike
//@desc       Likes/Unlikes a post
//@access     Private
router.put("/:id/unlike", isAuth, async (req, res) => {
  try {
    //postId
    const { id } = req.params;
    const { id: userId } = req.user;
    //ID validity check
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ msg: "ID not valid" });
    }
    //finds post in the db
    const post = await Post.findById(id);
    //check if post exists
    if (!post) {
      return res.status(404).send({ msg: "Post Not Found" });
    }

    if (post.approvalPending) {
      return res.status(404).send({ msg: "Can't like pending posts" });
    }
    //checks if post is not yet been liked by post.likes.some()
    if (!post.likes.some((likesId) => likesId.toString() === userId)) {
      return res.status(400).send({ msg: "Post not liked yet" });
    }

    //filters the liikes array keeping the user.id who are not the user sending the req
    post.likes = post.likes.filter((likesId) => likesId.toString() !== userId);
    //updates the user (req.user) pulling the party id into his likes array
    await User.findByIdAndUpdate(
      userId,
      { $pull: { likes: id } },
      { new: true }
    );

    await post.save();

    res.send(post.likes);
  } catch (err) {
    return res.status(500).send({ msg: "Server Error" });
  }
});

//@route      PUT /api/v1/posts/:id/agree
//@desc       Agrees to a post
//@access     Private
router.put("/:id/agree", isAuth, async (req, res) => {
  try {
    //postId
    const { id } = req.params;
    const { id: userId } = req.user;
    //ID validity check
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ msg: "ID not valid" });
    }
    //find post in the db
    const post = await Post.findById(id);
    //check if post exists
    if (!post) {
      return res.status(404).send({ msg: "Post Not Found" });
    }
    //check if post is pending
    if (post.approvalPending) {
      return res.status(404).send({ msg: "Can't agree pending posts" });
    }

    if (
      //checks if there is a user who's agreed to the post already
      post.agrees.some((agreesId) => agreesId.toString() === userId)
    ) {
      return res.status(404).send({ msg: "Post Already Agreed" });
    } else {
      post.agrees.unshift(userId);
    }

    await post.save();

    res.send(post.agrees);
  } catch (err) {
    return res.status(500).send({ msg: "Server Error" });
  }
});

//@route      PUT /api/v1/posts/:id/deserve
//@desc       Put a deservo to a post
//@access     Private
router.put("/:id/deserve", isAuth, async (req, res) => {
  try {
    //postId
    const { id } = req.params;
    const { id: userId } = req.user;
    //ID validity check
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ msg: "ID not valid" });
    }
    //find post in the db
    const post = await Post.findById(id);
    //check if post exists
    if (!post) {
      return res.status(404).send({ msg: "Post Not Found" });
    }
    //check if post is pending
    if (post.approvalPending) {
      return res.status(404).send({ msg: "Can't deserve pending posts" });
    }

    if (
      //checks if there is a user who's put a deserve to the post already
      post.deserves.some((deserveId) => deserveId.toString() === userId)
    ) {
      return res.status(404).send({ msg: "Post Already Deserved" });
    } else {
      post.deserves.unshift(userId);
    }

    await post.save();

    res.send(post.deserves);
  } catch (err) {
    return res.status(500).send({ msg: "Server Error" });
  }
});

//@route      PUT /api/v1/posts/:id/comment
//@desc       Comments a post
//@access     Private
router.put(
  "/:id/comment",
  isAuth,
  check("text", "Text is required").notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { id: userId } = req.user;
      //ID validity check
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({ msg: "ID not valid" });
      }

      const user = await User.findById(userId);
      const post = await Post.findById(id);
      //check if post exists
      if (!post) {
        return res.status(404).send({ msg: "Post Not Found" });
      }

      if (post.approvalPending) {
        return res.status(404).send({ msg: "Can't comment on pending posts" });
      }

      const newComment = {
        user: userId,
        text: req.body.text,
        username: user.username,
        image: user.image,
      };

      post.comments.unshift(newComment);

      await post.save();

      res.send(post.comments);
    } catch (error) {
      return res.status(500).send({ msg: "Server Error" });
    }
  }
);

module.exports = router;
