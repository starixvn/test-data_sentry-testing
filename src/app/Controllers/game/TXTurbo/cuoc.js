const ConfigHelper = require("./../../../Helpers/ConfigHelper");
const NoticeMessages = require("./../constants/notice-messages");

const validateBetRequest = (player, payload) => {
  const bet = payload.bet >> 0;
  const select = !!payload.select;
  const configs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.TXTurbo);

  const gameData = player.redT.taixiu_turbo;
  const { betTracks } = gameData.ingame[player.profile.name] || { betTracks: {} };

  const criteria = [
    {
      failure: player.redT.TXTurbo_time < 6 || player.redT.TXTurbo_time >= 30,
      notice: NoticeMessages.placeBetNextRound,
    },
    {
      failure: bet < configs.minbet,
      notice: NoticeMessages.minBet(configs.minbet),
    },
    {
      failure: bet > configs.maxbet,
      notice: NoticeMessages.maxBet(configs.maxbet),
    },
    {
      failure: bet > configs.maxbet,
      notice: NoticeMessages.maxBet(configs.maxbet),
    },
    {
      failure: betTracks[select] + bet > configs.maxbet,
      notice: NoticeMessages.maxBet(configs.maxbet),
    },
    {
      failure: (betTracks[!select] ?? 0) > 0,
      notice: NoticeMessages.oneChoiceAllowed,
    },
  ];

  const failedCriterion = criteria.find((criterion) => criterion.failure);

  if (failedCriterion) {
    player.red({ taixiu_turbo: { err: failedCriterion.notice } });

    return false;
  }

  return true;
};

module.exports = function (player, payload) {
  if (validateBetRequest(player, payload)) {
    const name = player.profile.name;
    const bet = payload.bet >> 0;
    const select = !!payload.select;
    const gameData = player.redT.taixiu_turbo;

    if (gameData.ingame[name]) {
      gameData.ingame[name].betTracks[select] += bet;
      gameData.ingame[name].betQueue.push({ player, payload });
    } else {
      const newPlayer = {
        name: player.profile.name,
        betTracks: {},
        betQueue: [{ player, payload }],
      };

      newPlayer.betTracks[select] = bet;
      gameData.ingame[name] = newPlayer;
    }
  }
};
