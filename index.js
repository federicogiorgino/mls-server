require("./src/models/User.js");
require("./src/models/Post.js");
require("dotenv/config");

const express = require("express");
const mongoose = require("mongoose");

const app = express();

app.use(express.json());

const PORT = process.env.PORT;
const MONGOURI = process.env.MONGO_URI;

mongoose.connect(MONGOURI, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
});

mongoose.connection.on("connected", () => {
  console.log("Connected To MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.log("Error:", err);
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
