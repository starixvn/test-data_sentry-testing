let mongoose = require("mongoose");

let Schema = new mongoose.Schema({
  local: {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true, hide: true },
    ban_pass: { type: Number, default: 0 },
    ban_login: { type: Boolean, default: false },
    token: String,
    lastDate: String,
    lastLogin: String,
    regDate: Date,
    clientId: String,
    memberId: Number,
    memberName: String,
    currency: String,
  },
  facebook: {
    id: String,
    token: String,
    email: String,
    name: String,
    regDate: Date,
  },
  twitter: {
    id: String,
    token: String,
    email: String,
    name: String,
    regDate: Date,
  },
  google: {
    id: String,
    token: String,
    email: String,
    name: String,
    regDate: Date,
  },
});

// Các phương thức ======================

// Tài khoản bị khóa
Schema.methods.isBan = function () {
  return this.local.ban_login;
};

// Kiểm tra khóa lấy lại mật khẩu
Schema.methods.forGotPass = function () {
  return this.local.ban_pass;
};

module.exports = mongoose.model("Users", Schema);
