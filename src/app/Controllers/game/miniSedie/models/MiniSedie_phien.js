const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-auto-increment-reworked").MongooseAutoIncrementID;
const settlementResultSchema = new mongoose.Schema(
  {
    odd: { type: Boolean, default: false },
    even: { type: Boolean, default: false },
    red3: { type: Boolean, default: false },
    red4: { type: Boolean, default: false },
    white3: { type: Boolean, default: false },
    white4: { type: Boolean, default: false },
  },
  { _id: false }
);
const Schema = new mongoose.Schema({
  red1: { type: Boolean, required: true },
  red2: { type: Boolean, required: true },
  red3: { type: Boolean, required: true },
  red4: { type: Boolean, required: true },
  settlementResult: settlementResultSchema,
  time: { type: Date, default: new Date() },
});

Schema.plugin(AutoIncrement.plugin, { modelName: "MiniSedie_phien", field: "id" });

module.exports = mongoose.model("MiniSedie_phien", Schema);
