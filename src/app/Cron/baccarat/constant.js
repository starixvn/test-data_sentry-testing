const constants = {
  betTime: 30,
  lockBet: 5,
  resetDataTime: 34,
  startCountDownTime: 45,
  getGameConfigTime: 44
};

const userHistoryPagination = {
  limit: 8
}

const chips = [1, 5, 10, 50, 100, 200, 500];

const choiceNames = {
  tie: 'tie',
  player: 'player',
  banker: 'banker'
}

const boxes = ['player', 'banker', 'big', 'small', 'tie', 'playerPair', 'bankerPair'];

const queueProcessing = {
  timeout: 50
};

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

const defaultChips = {
  player: { ...chipsCount },
  banker: { ...chipsCount },
  tie: { ...chipsCount },
  big: { ...chipsCount },
  small: { ...chipsCount },
  playerPair: { ...chipsCount },
  bankerPair: { ...chipsCount }
};

module.exports = {
  chips,
  boxes,
  constants,
  queueProcessing,
  userHistoryPagination,
  defaultChips,
  choiceNames
};
