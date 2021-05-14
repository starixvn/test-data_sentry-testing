const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-auto-increment-reworked").MongooseAutoIncrementID;

const settlementResultSchema = new mongoose.Schema(
  {
    straightUp: { type: [String], default: [] },
    split: { type: [String], default: [] },
    street: { type: [String], default: [] },
    triangle: { type: [String], default: [] },
    corner: { type: [String], default: [] },
    fourNumbers: { type: [String], default: [] },
    line: { type: [String], default: [] },
    column: { type: [String], default: [] },
    dozen: { type: [String], default: [] },
    redBlack: { type: [String], default: [] },
    oddEven: { type: [String], default: [] },
    bigSmall: { type: [String], default: [] },
  },
  { _id: false }
);

const schema = new mongoose.Schema({
  result: { type: Number, required: true },
  settlementResult: settlementResultSchema,
  time: { type: Date, default: new Date() },
});

schema.plugin(AutoIncrement.plugin, { modelName: "Roulette_phien", field: "id" });

module.exports = mongoose.model("Roulette_phien", schema);
