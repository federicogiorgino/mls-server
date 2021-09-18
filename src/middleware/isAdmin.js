const mongoose = require("mongoose");
const User = mongoose.model("User");

module.exports = (req, res, next) => {
  const user = User.find(req.user.id);

  if (!user.admin) {
    return res.status(404).send({ msg: "You are not an admin" });
  } else {
    next();
  }
};
