const { Schema } = require("mongoose");

module.exports = new Schema({
  uid: { type: String, required: true },
  name: { type: String, required: true },
  phien: { type: Number, required: true },
  time: { type: Date, required: true },

  choice: { type: String, required: true },
  amount: { type: Number, required: true },

  memberId: { type: Number },
  siteId: { type: String },
});
