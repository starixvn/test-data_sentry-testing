const ConfigHelper = require("../../../Helpers/ConfigHelper");
const constants = require("./../../../Cron/KenoProMax/constants");

const NoticeMessages = require("./../constants/notice-messages");

const validateBetRequest = (realPlayer, kenoProMax, { amount, box }) => {
  if (!amount || !box) {
    return false;
  }

  const configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.KenoProMax);

  const betsOfThisUser = kenoProMax.ingame[realPlayer.profile.name] || {};
  const totalBets = constants.choices.reduce((total, choice) => total + betsOfThisUser[choice], 0);
  const maxBetForChoice = configs.choices_maxbet[box] || 0;

  const metadata = [
    {
      condition: kenoProMax.remainingTime < constants.lockingBetDuration || kenoProMax.remainingTime >= constants.placingBetDuration,
      notice: NoticeMessages.placeBetNextRound,
    },
    {
      condition: amount > maxBetForChoice || betsOfThisUser[box] + amount > maxBetForChoice,
      notice: NoticeMessages.maxBetForChoice(maxBetForChoice),
    },
    {
      condition: amount < configs.minbet,
      notice: NoticeMessages.minBet(configs.minbet),
    },
    {
      condition: amount > configs.maxbet,
      notice: NoticeMessages.maxBet(configs.maxbet),
    },
    {
      condition: totalBets + amount > configs.maxbet,
      notice: NoticeMessages.maxBet(configs.maxbet),
    },
  ];

  const result = metadata.filter((data) => data.condition);

  if (result.length > 0) {
    realPlayer.red({ kenoProMax: { notice: result[0].notice, endBet: -1 } });

    return false;
  }

  return true;
};

module.exports = (realPlayer, data) => {
  const kenoProMax = realPlayer.redT.kenoProMax;

  if (validateBetRequest(realPlayer, kenoProMax, data)) {
    const amount = data.amount >> 0;
    const box = data.box;

    if (kenoProMax.ingame[realPlayer.profile.name]) {
      kenoProMax.ingame[realPlayer.profile.name][box] += amount;
      kenoProMax.ingame[realPlayer.profile.name].betQueue.push({ data: data, realPlayer: realPlayer });
    } else {
      const newData = {
        name: realPlayer.profile.name,
        ...constants.resetTotalBets,
        betQueue: [{ data: data, realPlayer: realPlayer }],
      };

      newData[box] = amount;
      kenoProMax.ingame[realPlayer.profile.name] = newData;
    }
  }
};
