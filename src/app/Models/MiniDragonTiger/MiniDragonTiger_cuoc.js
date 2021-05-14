
let mongoose = require('mongoose');

let Schema = new mongoose.Schema({
    uid: { type: String, required: true },
    name: { type: String, required: true },
    phien: { type: Number, required: true, index: true },
    red: { type: Boolean, required: true },

    dragon: { type: Number, default: 0 },
    tie: { type: Number, default: 0 },
    tiger: { type: Number, default: 0 },

    thanhtoan: { type: Boolean, default: false },
    bigWin: { type: Boolean, default: false },
    betwin: { type: Number, default: 0 },
    time: { type: Date },

    memberId: { type: Number },
    siteId: { type: String }
});

module.exports = mongoose.model('MiniDragonTiger_cuoc', Schema);