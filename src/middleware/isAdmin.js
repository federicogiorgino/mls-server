const mongoose = require("mongoose");

module.exports = (req, res, next) => {
  if (!req.user.admin) {
    return res.status(404).send({ msg: "You are not an admin" });
  } else {
    next();
  }
};
