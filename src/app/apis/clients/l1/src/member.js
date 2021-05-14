const { createAction } = require("./util");

const metadata = [
  {
    action: "/Member/EnterPortal",
    name: "notifyLogin"
  },
  {
    action: "/Member/Balance",
    name: "balance"
  },
  {
    action: "/Member/PlaceBet",
    name: "placeBet"
  },
  {
    action: "/Member/EndGame",
    name: "endGame"
  },
  {
    action: "/Member/VoidGame",
    name: "voidGame"
  },
  {
    action: "/Member/EnterPortal",
    name: "enterPortal"
  },
  {
    action: "/Member/GetBetLimit",
    name: "getBetLimit"
  }
];

module.exports = config => createAction(metadata, config);
