const ConfigHelper = require("./../../../Helpers/ConfigHelper");
const NoticeMessages = require("./../constants/notice-messages");
const Constants = require("./constants");

const validateBetRequest = (player, { amount, betChoice }) => {
  if (!amount || !betChoice) {
    return false;
  }

  const miniSedieData = player.redT.miniSedie;
  const configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.MiniSedie);

  const { betTracks } = miniSedieData.ingame[player.profile.name] || { betTracks: {} };
  const totalAmount = Constants.choices.reduce((total, choice) => total + (betTracks[choice] || 0), 0) + amount;
  const maxBetPerChoice = configs.choices_maxbet[betChoice] || 0;
  const shakeThePlateTime = Constants.placingBetDuration + Constants.shakeThePlateDuration;

  const criteria = [
    {
      failure: miniSedieData.remainingTime >= Constants.placingBetDuration && miniSedieData.remainingTime <= shakeThePlateTime,
      notice: NoticeMessages.cannotPlaceBet,
    },
    {
      failure: miniSedieData.remainingTime < Constants.lockingBetDuration || miniSedieData.remainingTime > shakeThePlateTime,
      notice: NoticeMessages.placeBetNextRound,
    },
    {
      failure: amount > maxBetPerChoice || betTracks[betChoice] + amount > maxBetPerChoice,
      notice: NoticeMessages.maxBetForChoice(maxBetPerChoice),
    },
    {
      failure: amount < configs.minbet,
      notice: NoticeMessages.minBet(configs.minbet),
    },
    {
      failure: amount > configs.maxbet,
      notice: NoticeMessages.maxBet(configs.maxbet),
    },
    {
      failure: totalAmount > configs.maxbet,
      notice: NoticeMessages.maxBet(configs.maxbet),
    },
  ];

  const failedCriterion = criteria.find((criterion) => criterion.failure);

  if (failedCriterion) {
    player.red({ miniSedie: { notice: failedCriterion.notice, endBet: -1 } });

    return false;
  }

  return true;
};

module.exports = (player, payload) => {
  if (validateBetRequest(player, payload)) {
    const name = player.profile.name;
    const amount = payload.amount >> 0;
    const betChoice = payload.betChoice;
    const miniSedieData = player.redT.miniSedie;

    if (miniSedieData.ingame[name]) {
      miniSedieData.ingame[name].betTracks[betChoice] += amount;
      miniSedieData.ingame[name].betQueue.push({ player, payload });
    } else {
      const newPlayer = {
        name: player.profile.name,
        betTracks: { ...Constants.resetTotalBets },
        betQueue: [{ player, payload }],
      };

      newPlayer.betTracks[betChoice] = amount;
      miniSedieData.ingame[name] = newPlayer;
    }
  }
};
