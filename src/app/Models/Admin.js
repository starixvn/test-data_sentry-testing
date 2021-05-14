let mongoose = require("mongoose");

let Schema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true, hide: true },
  rights: { type: Number, default: 0 },
  token: String,
  lastLogin: String,
  regDate: Date,
});

module.exports = mongoose.model("Admin", Schema);
