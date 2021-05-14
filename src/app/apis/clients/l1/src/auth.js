const { createAction } = require("./util");

const metadata = [
  {
    action: "/AuthVerification/verify",
    name: "verifyToken"
  },
  {
    action: "/signin/index",
    name: "singleSignOn"
  }
];

module.exports = config => createAction(metadata, config);
