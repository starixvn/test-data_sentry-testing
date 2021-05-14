let Admin = require("./Admin");

let TaiXiu = require("./game/taixiu");
let TXTurbo = require("./game/tx_turbo");
let BauCua = require("./game/baucua");
let MiniPoker = require("./game/mini_poker");
let BigBabol = require("./game/big_babol");
let VuongQuocRed = require("./game/vq_red");
let mini3cay = require("./game/mini3cay");
let angrybirds = require("./game/angrybirds");

let candy = require("./game/candy");
let longlan = require("./game/longlan");
let xs = require("./game/xs");

let ChanLe = require("./game/chanle");
let ChanLeTurbo = require("./game/chane_turbo");
let miniDragonTiger = require("./game/mini_dragon_tiger");
const kenoProMax = require("./game/keno-pro-max");
const miniSedie = require("./game/miniSedie");
const baccarat = require("./game/baccarat");
const miniKeno = require("./game/mini-keno");
const roulette = require("./game/roulette");

module.exports = function (client, data) {
  if (!!data) {
    if (!!data.admin) {
      Admin.onData(client, data.admin);
    }

    // Begin Game
    if (!!data.taixiu) {
      TaiXiu(client, data.taixiu);
    }
    if (!!data.taixiu_turbo) {
      TXTurbo(client, data.taixiu_turbo);
    }
    if (!!data.baucua) {
      BauCua(client, data.baucua);
    }
    if (!!data.mini_poker) {
      MiniPoker(client, data.mini_poker);
    }
    if (!!data.big_babol) {
      BigBabol(client, data.big_babol);
    }
    if (!!data.vq_red) {
      VuongQuocRed(client, data.vq_red);
    }
    if (!!data.mini3cay) {
      mini3cay(client, data.mini3cay);
    }
    if (!!data.angrybird) {
      angrybirds(client, data.angrybird);
    }
    if (!!data.candy) {
      candy(client, data.candy);
    }
    if (!!data.longlan) {
      longlan(client, data.longlan);
    }

    // if (!!data.chanle) {
    //   ChanLe(client, data.chanle);
    // }

    if (!!data.clturbo) {
      ChanLeTurbo(client, data.clturbo);
    }

    if (!!data.xs) {
      xs(client, data.xs);
    }
    if (!!data.mini_dragon_tiger) {
      miniDragonTiger(client, data.mini_dragon_tiger);
    }

    if (!!data.kenoProMax) {
      kenoProMax(client, data.kenoProMax);
    }

    if (!!data.miniSedie) {
      miniSedie(client, data.miniSedie);
    }

    if (!!data.baccarat) {
      baccarat(client, data.baccarat);
    }

    miniKeno(client, data);

    if (!!data.roulette) {
      roulette(client, data.roulette);
    }
  }
};
