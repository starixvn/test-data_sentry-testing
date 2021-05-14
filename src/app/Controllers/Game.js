/**
 * Mini Game
 */
// Mini Poker
let mini_poker = require("./game/mini_poker");

// Big Babol
let big_babol = require("./game/big_babol");

// Bầu Cua
let baucua = require("./game/baucua");

// Mini 3 Cây
let mini3cay = require("./game/mini3cay");

// Cao Thấp
let caothap = require("./game/caothap");

// AngryBirds
let angrybird = require("./game/angrybird");

let megaj = require("./game/megaj");

/**
 * Game
 */
// Vương Quốc Red
let vq_red = require("./game/vuong_quoc_red");

// Candy
let Candy = require("./game/candy");

// Poker
let Poker = require("./game/poker");

// Long Lân
let LongLan = require("./game/longlan");

// Reg game
let reg = require("./game/reg");

// Xo So
let xs = require("./game/xs");

// Chan Le
let chanLe = require("./game/chanle/ChanLe");

let clTurbo = require("./game/chanle_turbo/ChanLeTurbo");

// Dragon Tiger
let miniDragonTiger = require("./game/miniDragonTiger/index");

// Keno Pro Max
let kenoProMax = require("./game/KenoProMax");

// Mini Sebie
let miniSedie = require("./game/miniSedie/index");

// Baccarat
const baccarat = require("./game/baccarat");

// RNG Mini Keno
const kenoMax = require("./game/MiniKeno/Max");
const kenoMax2 = require("./game/MiniKeno/Max2");
const kenoMini = require("./game/MiniKeno/Mini");
const kenoMini2 = require("./game/MiniKeno/Mini2");
const kenoEast = require("./game/MiniKeno/East");
const kenoWest = require("./game/MiniKeno/West");
const kenoSouth = require("./game/MiniKeno/South");
const kenoNorth = require("./game/MiniKeno/North");
const kenoProViet = require("./game/MiniKeno/ProViet");

// Roulette
const roulette = require("./game/Roulette");

module.exports = function (client, data) {
  if (!!data.mini_poker) {
    mini_poker(client, data.mini_poker);
  }
  if (!!data.big_babol) {
    big_babol(client, data.big_babol);
  }
  if (!!data.vq_red) {
    vq_red(client, data.vq_red);
  }
  if (!!data.baucua) {
    baucua(client, data.baucua);
  }
  if (!!data.mini3cay) {
    mini3cay(client, data.mini3cay);
  }
  if (!!data.caothap) {
    caothap(client, data.caothap);
  }
  if (!!data.angrybird) {
    angrybird(client, data.angrybird);
  }

  if (!!data.megaj) {
    megaj(client, data.megaj);
  }

  if (!!data.poker) {
    Poker(client, data.poker);
  }

  if (!!data.candy) {
    Candy(client, data.candy);
  }

  if (!!data.longlan) {
    LongLan(client, data.longlan);
  }

  if (!!data.reg) {
    reg(client, data.reg);
  }

  if (!!data.xs) {
    xs(client, data.xs);
  }

  // if (!!data.chanle) {
  //   chanLe(client, data.chanle);
  // }

  if (!!data.clturbo) {
    clTurbo(client, data.clturbo);
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

  if (!!data.kenoMax) {
    kenoMax(client, data.kenoMax);
  }

  if (!!data.kenoMax2) {
    kenoMax2(client, data.kenoMax2);
  }

  if (!!data.kenoMini) {
    kenoMini(client, data.kenoMini);
  }

  if (!!data.kenoMini2) {
    kenoMini2(client, data.kenoMini2);
  }

  if (!!data.kenoEast) {
    kenoEast(client, data.kenoEast);
  }

  if (!!data.kenoWest) {
    kenoWest(client, data.kenoWest);
  }

  if (!!data.kenoSouth) {
    kenoSouth(client, data.kenoSouth);
  }

  if (!!data.kenoNorth) {
    kenoNorth(client, data.kenoNorth);
  }

  if (!!data.kenoProViet) {
    kenoProViet(client, data.kenoProViet);
  }

  if (!!data.roulette) {
    roulette(client, data.roulette);
  }
};
