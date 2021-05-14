function convertBauCua(linhVat) {
  return linhVat + 1;
}

function convertTaiXiu(isTai) {
  return isTai ? 1 : 2;
}

function convertChanLe(isChan) {
  return isChan ? 1 : 2;
}

function convertMiniDragonTiger(choiceName) {
  if (choiceName == "dragon") {
    return 1;
  }

  if (choiceName == "tiger") {
    return 2;
  }

  if (choiceName == "tie") {
    return 3;
  }

  return 0;
}

function convertKeno(choiceName) {
  switch (choiceName) {
    case "big":
      return 1;
    case "small":
      return 2;
    case "odd":
      return 3;
    case "even":
      return 4;
    case "gold":
      return 5;
    case "wood":
      return 6;
    case "water":
      return 7;
    case "fire":
      return 8;
    case "earth":
      return 9;
    default:
      return 0;
  }
}

function convertMiniSedie(choiceName) {
  switch (choiceName) {
    case "even":
      return 1;
    case "odd":
      return 2;
    case "red3":
      return 3;
    case "red4":
      return 4;
    case "white3":
      return 5;
    case "white4":
      return 6;
    default:
      return 0;
  }
}

function convertBaccarat(choiceName) {
  const data = {
    player: 1,
    banker: 2,
    tie: 3,
    big: 4,
    small: 5,
    playerPair: 6,
    bankerPair: 7,
  };

  return data[choiceName] || 0;
}

module.exports = {
  convertBauCua,
  convertTaiXiu,
  convertChanLe,
  convertMiniDragonTiger,
  convertKeno,
  convertMiniSedie,
  convertBaccarat,
};
