const socket = require("./app/Controllers/admin/socket.js");
const appConfigs = require("./config/appConfigs");
const logger = require("./app/web/logger").getLogger();
const jwt = require("jsonwebtoken");
const privateKey = appConfigs.adminSecretKey;

// Authenticate!
const authenticate = function (client, data, callback) {
  // JWT
  if (!!data && !!data.jwt) {
    try {
      const token = data.jwt;
      const { username } = jwt.verify(token, privateKey);

      client.UID = username;

      callback(false, true);
    } catch (e) {
      callback({ title: "THÔNG BÁO", text: "Có lỗi xảy ra, vui lòng kiểm tra lại." }, false);
    }
  }
};

module.exports = function (ws, redT) {
  ws.admin = true;
  ws.auth = false;
  ws.UID = null;

  ws.red = function (data) {
    try {
      this.readyState == 1 && this.send(JSON.stringify(data));
    } catch (err) {
      logger.logWarning(err);
    }
  };

  ws.on("message", function (message) {
    try {
      if (!!message) {
        message = JSON.parse(message);
        if (this.auth == false && !!message.authentication) {
          authenticate(this, message.authentication, function (err, success) {
            if (success) {
              ws.auth = true;
              ws.redT = redT;
              if (void 0 !== ws.redT.admins[ws.UID]) {
                ws.redT.admins[ws.UID].push(ws);
              } else {
                ws.redT.admins[ws.UID] = [ws];
              }
              socket.auth(ws);
            } else if (!!err) {
              ws.red({ unauth: err });
            } else {
              ws.red({ unauth: { message: "Authentication failure" } });
            }
          });
        } else if (!!this.auth) {
          socket.message(this, message);
        }
      }
    } catch (error) {
      logger.logError(err);
    }
  });

  ws.on("close", function (message) {
    try {
      if (this.UID !== null && void 0 !== this.redT.admins[this.UID]) {
        if (this.redT.admins[this.UID].length === 1 && this.redT.admins[this.UID][0] === this) {
          delete this.redT.admins[this.UID];
          if (this.redT) {
            delete this.redT;
          }
        } else {
          var self = this;
          this.redT.admins[this.UID].forEach(function (obj, index) {
            if (obj === self) {
              self.redT.admins[self.UID].splice(index, 1);
              if (self.redT) {
                delete self.redT;
              }
            }
          });
        }
      }
      this.auth = false;

      logger.log("socketAdmin close " + message);
    } catch (err) {
      logger.logWarning(err);
    }
  });
};
