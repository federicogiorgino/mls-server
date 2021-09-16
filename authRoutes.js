const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { check, validationResult } = require("express-validator");

const User = mongoose.model("User");

const router = express.Router();

//@route      POST /api/v1/auth/register
//@desc       Register a new user
//@access     Public
router.post(
  "/register",
  check("username", "Username is required").notEmpty(),
  check("email", "Please provide a valid email").isEmail(),
  check(
    "password",
    "Please enter a valid password (6 or more characters)"
  ).isLength({ min: 6 }),
  async (req, res) => {
    //error handling with express-validators
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    let user = await User.findOne({ email });

    if (user) {
      return res
        .status(400)
        .send({ errors: [{ msg: "Email already in use" }] });
    }

    try {
      //creates a new User instance with the properties provided
      const user = new User({ username, email, password });

      // saves it into the DB
      await user.save();

      //creates a JWT
      const token = jwt.sign({ userId: user._id }, "JWTSUPERSECRET");

      //sends back the JWT as a response to the request
      res.send({ token });
    } catch (err) {
      return res.status(422).send({ msg: "Server Error" });
    }
  }
);
