require("./src/models/User.js");
require("./src/models/Post.js");
require("dotenv/config");

const express = require("express");
const mongoose = require("mongoose");

const app = express();

app.use(express.json());
app.use("/api/v1/auth", require("./src/routes/authRoutes.js"));
app.use("/api/v1/posts", require("./src/routes/postsRoutes.js"));
app.use("/api/v1/users", require("./src/routes/usersRoutes.js"));

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
