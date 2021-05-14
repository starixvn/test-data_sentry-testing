const logger = require("../web/logger");
const numeral = require("numeral");
const appConstants = require("./../appConstants");

let cutEmail = function (email) {
  let data = email.split("@");
  let string = "";
  let start = "";
  if (data[0].length > 7) {
    start = data[0].slice(0, 6);
  } else {
    start = data[0].slice(0, data[0].length - 3);
  }
  return string.concat(start, "***@", data[1]);
};

let cutPhone = function (phone) {
  let string = "";
  let start = phone.slice(0, 3);
  let end = phone.slice(phone.length - 2, phone.length);
  return string.concat(start, "*****", end);
};

let validateEmail = function (t) {
  return /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
    t
  );
};

let checkPhoneValid = function (phone) {
  return /^[\+]?(?:[(][0-9]{1,3}[)]|(?:84|0))[0-9]{7,10}$/im.test(phone);
};

let phoneCrack = function (phone) {
  let data = phone.match(/^[\+]?(?:[(][0-9]{1,3}[)]|(?:84|0))/im);
  if (data) {
    return {
      region: data[0],
      phone: phone.slice(data[0].length, phone.length),
    };
  }
  return data;
};

let nFormatter = function (t, e) {
  for (
    let i = [
        {
          value: 1e18,
          symbol: "E",
        },
        {
          value: 1e15,
          symbol: "P",
        },
        {
          value: 1e12,
          symbol: "T",
        },
        {
          value: 1e9,
          symbol: "G",
        },
        {
          value: 1e6,
          symbol: "M",
        },
        {
          value: 1e3,
          symbol: "k",
        },
      ],
      o = /\.0+$|(\.[0-9]*[1-9])0+$/,
      n = 0;
    n < i.length;
    n++
  )
    if (t >= i[n].value) return (t / i[n].value).toFixed(e).replace(o, "$1") + i[n].symbol;
  return t.toFixed(e).replace(o, "$1");
};

let anPhanTram = function (bet, so_nhan, ti_le, type = false) {
  // so_nhan: số nhân
  // ti_le: tỉ lệ thuế
  // type: Thuế tổng, thuế gốc
  let vV = bet * so_nhan;
  let vT = !!type ? vV : bet;
  return vV - Math.ceil((vT * ti_le) / 100);
};

// kiểm tra chuỗi chống
let isEmpty = function (str) {
  return !str || 0 === str.length;
};

// đổi số thành tiền
let numberWithCommas = function (number) {
  if (number) {
    let result = (number = parseInt(number)).toString().split(".");
    return (result[0] = result[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".")), result.join(".");
  }
  return "0";
};

// Lấy số từ chuỗi
let getOnlyNumberInString = function (t) {
  let e = t.match(/\d+/g);
  return e ? e.join("") : "";
};

// thêm số 0 trước dãy số (lấp đầy bằng số 0)
let numberPad = function (number, length) {
  // number: số
  // length: độ dài dãy số
  let str = "" + number;
  while (str.length < length) str = "0" + str;

  return str;
};

let shuffle = function (array) {
  let m = array.length,
    t,
    i;
  while (m) {
    i = Math.floor(Math.random() * m--);
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }
  return array;
};

let ThongBaoNoHu = function (io, data) {
  io.clients.forEach(function (client) {
    if (void 0 === client.admin && (client.auth === false || client.scene === "home")) {
      client.red({ pushnohu: data });
    }
  });
};

let ThongBaoBigWin = function (io, data) {
  io.clients.forEach(function (client) {
    if (void 0 === client.admin && (client.auth === false || client.scene === "home")) {
      client.red({ news: { t: data } });
    }
  });
};

let getRandomNumber = function (max) {
  return Math.floor(Math.random() * Math.floor(max));
};

let getRandomChips = function (max) {
  let chips = [];
  let hasChip = false;

  try {
    appConstants.chipList.forEach((chip) => {
      const getChip = Math.floor(max / chip);

      if (!hasChip && getChip >= 1) {
        chips.push(1);

        hasChip = true;
        max = max % chip;
      } else {
        chips.push(0);
      }
    });
  } catch (err) {
    logger.logError(err);
  }

  return chips;
};

let getRandomNumberStep5 = function (min, max, isUseChips) {
  let randomAmount = Math.floor(Math.random() * max) + min;

  if (randomAmount <= 20 && !isUseChips) {
    return randomAmount;
  }

  let step = 5;

  if (randomAmount < 50) {
    step = 5;
  } else if (randomAmount < 100) {
    step = 10;
  } else if (randomAmount < 1000) {
    step = 50;
  } else {
    step = 100;
  }

  step = step < min ? min : step;

  let number = Math.floor(randomAmount / step) * step;

  if (number < min) {
    number = min;
  }

  return number;
};

const getRandomAmount = (min, max, isUnround) => {
  if (isUnround) return Math.floor(Math.random() * max) + min;

  return getRandomNumberStep5(min, max, true);
};

const formatNumberWithComma = function (number) {
  return numeral(number).format("0,0");
};

const convertBetChoiceName = (name) => {
  switch (name) {
    case "chan":
      return "even";
    case "le":
      return "odd";
    default:
      return name;
  }
};

module.exports = {
  anPhanTram: anPhanTram,
  isEmpty: isEmpty,
  numberWithCommas: numberWithCommas,
  getOnlyNumberInString: getOnlyNumberInString,
  numberPad: numberPad,
  shuffle: shuffle,
  validateEmail: validateEmail,
  checkPhoneValid: checkPhoneValid,
  phoneCrack: phoneCrack,
  nFormatter: nFormatter,
  ThongBaoNoHu: ThongBaoNoHu,
  ThongBaoBigWin: ThongBaoBigWin,
  cutEmail: cutEmail,
  cutPhone: cutPhone,
  getRandomNumber: getRandomNumber,
  getRandomChips: getRandomChips,
  getRandomNumberStep5: getRandomNumberStep5,
  formatNumberWithComma: formatNumberWithComma,
  convertBetChoiceName: convertBetChoiceName,
  getRandomAmount: getRandomAmount,
};
