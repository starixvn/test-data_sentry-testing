const chipsCount = {
  "1": 0,
  "5": 0,
  "10": 0,
  "50": 0,
  "100": 0,
  "200": 0,
  "500": 0,
  "1000": 0,
};

module.exports = {
  lockingBetDuration: 5,
  placingBetDuration: 30,
  roundDuration: 39,
  choices: ["big", "small", "odd", "even", "gold", "wood", "water", "fire", "earth"],
  resetTotalBets: {
    big: 0,
    small: 0,
    odd: 0,
    even: 0,
    gold: 0,
    wood: 0,
    water: 0,
    fire: 0,
    earth: 0,
  },
  resetChipsCount: {
    big: { ...chipsCount },
    small: { ...chipsCount },
    odd: { ...chipsCount },
    even: { ...chipsCount },
    gold: { ...chipsCount },
    wood: { ...chipsCount },
    water: { ...chipsCount },
    fire: { ...chipsCount },
    earth: { ...chipsCount },
  },
};
