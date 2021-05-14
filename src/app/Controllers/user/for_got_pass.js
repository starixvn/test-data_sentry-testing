var User = require("../../Models/Users");
var UserInfo = require("../../Models/UserInfo");
var OTP = require("../../Models/OTP");
var Phone = require("../../Models/Phone");

var validator = require("validator");
var smsOTP = require("../../sms").sendOTP;

function sendOTP(client, name) {
  if (!!name) {
    name = "" + name + "";
    var az09 = new RegExp("^[a-zA-Z0-9]+$");
    var testName = az09.test(name);
    if (!validator.isLength(name, { min: 3, max: 32 }) || !testName) {
      client.red({ notice: { title: "LỖI", text: "Vui lòng nhập chính xác tên tài khoản..." } });
    } else {
      name = name.toLowerCase();
      User.findOne({ "local.username": name }).exec(function (err, check) {
        if (!!check) {
          if (check["local"]["ban_pass"] > 3) {
            client.red({ notice: { title: "LỖI", text: "Bạn đã đạt giới hạn lấy mã OTP, liên hệ Admin để được trợ giúp..." } });
            return void 0;
          }
          var cID = check._id.toString();
          Phone.findOne({ uid: cID }, function (err3, checkP) {
            if (checkP) {
              UserInfo.findOne({ id: cID }, "red").exec(function (err, user) {
                if (!!user) {
                  if (user.red < 1000) {
                    // Red không đủ để lấy OTP
                    client.red({ notice: { title: "THẤT BẠI", text: "Không thể lấy mã OTP vui lòng liên hệ admin." } });
                  } else {
                    OTP.findOne({ uid: cID, phone: checkP.phone }, {}, { sort: { _id: -1 } }, function (err, data_otp) {
                      if (!data_otp || (new Date() - Date.parse(data_otp.date)) / 1000 > 180 || data_otp.active) {
                        var otp = (Math.random() * (9999 - 1000 + 1) + 1000) >> 0; // OTP từ 1000 đến 9999
                        // Lấy SMS OTP
                        smsOTP(checkP.region + checkP.phone, otp);
                        OTP.create({ uid: cID, phone: checkP.phone, code: otp, date: new Date() });
                        User.updateOne({ _id: cID }, { $inc: { "local.ban_pass": 1 } }).exec();
                        UserInfo.updateOne({ id: cID }, { $inc: { red: -1000 } }).exec();
                        client.red({ notice: { title: "THÔNG BÁO", text: "Mã OTP đã được gửi vào số điện thoại của bạn..." } });
                      } else {
                        client.red({ notice: { title: "OTP", text: "Vui lòng kiểm tra hòm thư đến.!" } });
                      }
                    });
                  }
                } else {
                  client.red({ notice: { title: "LỖI", text: "Tài khoản này chưa tạo nhân vật..." } });
                }
              });
            } else {
              client.red({ notice: { title: "LỖI", text: "Tài khoản này chưa xác thực số điện thoại..." } });
            }
          });
        } else {
          client.red({ notice: { title: "LỖI", text: "Tên tài khoản không tồn tại..." } });
        }
      });
    }
  }
}

module.exports = function (client, data) {
  if (!!data) {
    if (!!data.sendOTP) {
      sendOTP(client, data.sendOTP);
    }
  }
};
