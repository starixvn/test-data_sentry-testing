let mongoose = require("mongoose");
let AutoIncrement = require("mongoose-auto-increment-reworked")
  .MongooseAutoIncrementID;

let settlementResultSchema = new mongoose.Schema(
  {
    big: { type: Boolean, default: false },
    small: { type: Boolean, default: false },
    odd: { type: Boolean, default: false },
    even: { type: Boolean, default: false },
    gold: { type: Boolean, default: false },
    wood: { type: Boolean, default: false },
    water: { type: Boolean, default: false },
    fire: { type: Boolean, default: false },
    earth: { type: Boolean, default: false },
  },
  { _id: false }
);

let Schema = new mongoose.Schema({
  result: { type: [Number], required: true },
  settlementResult: settlementResultSchema,
  time: { type: Date, default: new Date() },
});

Schema.plugin(AutoIncrement.plugin, {
  modelName: "KenoProMax_phien",
  field: "id",
});

module.exports = mongoose.model("KenoProMax_phien", Schema);
