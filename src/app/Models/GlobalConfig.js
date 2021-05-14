let mongoose = require("mongoose");

let Schema = new mongoose.Schema({
  type: { type: String, required: true },
  configs: { type: Object },
});

module.exports = mongoose.model("global_config", Schema);
