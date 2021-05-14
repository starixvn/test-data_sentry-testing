const mongoose = require("mongoose");
const AutoIncrement = require("mongoose-auto-increment-reworked").MongooseAutoIncrementID;

const RoundSchema = require("./../Schemas/Keno_phien").clone();
const BetSchema = require("./../Schemas/Keno_one");
const BetLogSchema = require("./../Schemas/Keno_cuoc");

RoundSchema.plugin(AutoIncrement.plugin, { modelName: "KenoMax_phien", field: "id" });

const KenoMax_phien = mongoose.model("KenoMax_phien", RoundSchema);
const KenoMax_one = mongoose.model("KenoMax_one", BetSchema);
const KenoMax_cuoc = mongoose.model("KenoMax_cuoc", BetLogSchema);

module.exports = {
  KenoMax_phien,
  KenoMax_one,
  KenoMax_cuoc,
};
