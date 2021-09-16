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
      .populate("user", "username image")
      .sort({ createdAt: -1 });

    res.send(allPosts);
  } catch (err) {
    return res.status(500).send({ msg: "Server Error" });
  }
});

//@route      GET /api/v1/posts/unapproved
//@desc       Gets all unaprroved posts
//@access     Private
router.get("/unapproved", isAuth, async (req, res) => {
  try {
    const allUnapprovedPosts = await Post.find({
      approved: false,
      approvalPending: true,
    })
      .populate("user", "username image")
      .sort({ createdAt: -1 });

    res.send(allUnapprovedPosts);
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

      // //finds the user in the db and pushes the post.id into the created post array
      // await User.findByIdAndUpdate(
      //   id,
      //   { $push: { posts: post.id } },
      //   { new: true }
      // );

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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ msg: "ID Not Valid" });
    }

    const post = await Post.findById(id).populate("user", "name image");

    if (!post) {
      return res.status(404).send({ msg: "Post not found" });
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ msg: "ID Not Valid" });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).send({ msg: "Post Not Found" });
    }

    if (post.user.toString() !== userId) {
      return res.status(401).send({ msg: "User unauthorized" });
    }

    //we update all user (regardless of checking if they have had the post in their attending)
    //and remove the post id from the attending array
    await User.updateMany({}, { $pull: { likes: id } }, { new: true });

    await post.remove();
    res.send({ msg: "Post deleted successfully" });
  } catch (err) {
    return res.status(500).send({ msg: "Server Error" });
  }
});

//@route      PUT /api/v1/posts/:id/approve
//@desc       Approves an unmoderated post
//@access     Private
router.put("/:id/approve", isAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId } = req.user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ msg: "ID Not Valid" });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).send({ msg: "Post not found" });
    }

    if (post.user.toString() === userId) {
      return res.status(404).send({ msg: "You cannot approve your own posts" });
    }

    if (post.approved || !post.approvalPending) {
      return res.status(404).send({ msg: "Post already approved" });
    }

    await Post.findByIdAndUpdate(
      id,
      {
        approved: true,
        approvalPending: false,
      },
      { new: true }
    );

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

//@route      PUT /api/v1/posts/:id/reject/
//@desc       Rejects an unmoderated post
//@access     Private
router.put("/:id/reject", isAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId } = req.user;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ msg: "ID Not Valid" });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).send({ msg: "Post not found" });
    }

    if (post.user.toString() === userId) {
      return res.status(404).send({ msg: "You cannot reject your own posts" });
    }

    if (post.approved || !post.approvalPending) {
      return res.status(404).send({ msg: "Post already rejected" });
    }

    await post.remove();

    res.send({ msg: "Post rejected successfully" });
  } catch (err) {
    return res.status(500).send({ msg: "Server Error" });
  }
});

//@route      PUT /api/v1/parties/:id/like
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

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).send({ msg: "Post Not Found" });
    }

    if (!post.approved && post.approvalPending) {
      return res.status(404).send({ msg: "Can't like non approved posts" });
    }

    if (
      post.likes.some(
        //checks if there is a user who's liked the post already
        (likesId) => likesId.toString() === userId
      )
    ) {
      post.likes = post.likes.filter(
        //filters the attending array keeping the user.id who are not the user sendig the req
        (likesId) => likesId.toString() !== userId
      );

      //finds the user based on the req.user.id and pulls the post id from attending array
      await User.findByIdAndUpdate(
        userId,
        {
          $pull: { likes: id },
        },
        { new: true }
      );
    } else {
      post.likes.unshift(userId);
      //finds the user based on the req.user.id and pushes the post id from attending array
      await User.findByIdAndUpdate(
        userId,
        {
          $push: { likes: id },
        },
        { new: true }
      );
    }

    await post.save();

    res.send(post);
  } catch (err) {
    return res.status(500).send({ msg: "Server Error" });
  }
});

//@route      PUT /api/v1/parties/:id/agree
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

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).send({ msg: "Post Not Found" });
    }

    if (!post.approved && post.approvalPending) {
      return res.status(404).send({ msg: "Can't agree non approved posts" });
    }

    if (
      post.agrees.some(
        //checks if there is a user who's agreed to the post already
        (agreesId) => agreesId.toString() === userId
      )
    ) {
      return res.status(404).send({ msg: "Post Already Agreed" });
    } else {
      post.agrees.unshift(userId);
    }

    await post.save();

    res.send(post);
  } catch (err) {
    return res.status(500).send({ msg: "Server Error" });
  }
});

//@route      PUT /api/v1/parties/:id/deserve
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

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).send({ msg: "Post Not Found" });
    }

    if (!post.approved && post.approvalPending) {
      return res
        .status(404)
        .send({ msg: "Can't put a deserve on non approved posts" });
    }

    if (
      post.deserves.some(
        //checks if there is a user who's put a deserve to the post already
        (deserveId) => deserveId.toString() === userId
      )
    ) {
      return res.status(404).send({ msg: "Post Already Deserved" });
    } else {
      post.deserves.unshift(userId);
    }

    await post.save();

    res.send(post);
  } catch (err) {
    return res.status(500).send({ msg: "Server Error" });
  }
});

//@route      PUT /api/v1/parties/:id/comment
//@desc       Comments a party
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

      if (!post) {
        return res.status(404).send({ msg: "Post Not Found" });
      }

      if (!post.approved && post.approvalPending) {
        return res
          .status(404)
          .send({ msg: "Can't comment on non approved posts" });
      }

      const newComment = {
        user: userId,
        text: req.body.text,
        username: user.username,
        image: user.image,
      };

      post.comments.unshift(newComment);

      await post.save();

      res.send(post);
    } catch (error) {
      return res.status(500).send({ msg: "Server Error" });
    }
  }
);

module.exports = router;
