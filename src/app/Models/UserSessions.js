let mongoose = require("mongoose");

let Schema = new mongoose.Schema({
    ssoToken: { type: String },
    sessionId: { type: String, unique: true, index: true },
    siteId: { type: String },
    userId: { type: String },
    username: { type: String },
    owSeq: { type: String },
    memberId: { type: Number },
    ssoTime: { type: Date },
    recheckInTime: { type: Date, required: true },
    ip: { type: String },
    browserUserAgent: { type: String },
    language: { type: String },
    currency: { type: String },
    clientId: { type: String },
    memberName: { type: String },
    siteName: { type: String },
    system: { type: Number },
});

Schema.index({ sessionId: 1 }, { background: true });

module.exports = mongoose.model("UserSessions", Schema);
