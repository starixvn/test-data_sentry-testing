const BalanceApi = require("./../../../apis/balanceApi");
const ConfigHelper = require("./../../../Helpers/ConfigHelper");
const KenoProMaxPhien = require("./../../../Models/KenoProMax/KenoProMax_phien");
const UserInfo = require("./../../../Models/UserInfo");
const Logger = require("./../../../web/logger");

const inGame = async (realPlayer, kenoProMaxData) => {
  const { remainingTime, totalBets, chips } = kenoProMaxData;
  const kenoProMaxConfigs = ConfigHelper.getConfigs(ConfigHelper.GameTypes.KenoProMax);
  const maxNumberOfRounds = 100;
  const gameConfigs = {
    minbet: kenoProMaxConfigs.minbet,
    maxbet: kenoProMaxConfigs.maxbet,
    choices_maxbet: kenoProMaxConfigs.choices_maxbet,
    odds: kenoProMaxConfigs.odds,
  };

  const getRounds = (limit) =>
    KenoProMaxPhien.find({}, "-_id id result settlementResult", { sort: { id: -1 }, limit })
      .lean()
      .exec();
  const getUserInfo = (uid) => UserInfo.findOne({ id: uid }, "-_id red avatarId").lean().exec();

  const [rawRoundHistory, user] = await Promise.all([getRounds(maxNumberOfRounds), getUserInfo(realPlayer.UID)]);
  const roundHistory = rawRoundHistory.map((round) => ({
    roundId: round.id,
    result: round.result,
    settlementResult: round.settlementResult,
  }));
  const players = { ...kenoProMaxData.players };
  const player = {
    id: realPlayer.UID,
    name: realPlayer.profile.name,
    ...user,
  };
  const ownBets = kenoProMaxData.ingame[realPlayer.profile.name];

  delete players[player.id];

  BalanceApi.getBalance({ id: realPlayer.UID }, realPlayer, (balance) => (player.red = balance.red || 0), true);

  if (!kenoProMaxData.realPlayers[player.id]) {
    return;
  }

  if (!kenoProMaxData.players[player.id]) {
    kenoProMaxData.players[player.id] = player;
  }

  const ingameData = {
    roundHistory,
    players,
    ownBets,
    remainingTime,
    totalBets,
    chips,
    gameConfigs,
  };

  realPlayer.red({ kenoProMax: ingameData });

  Object.values(kenoProMaxData.realPlayers).forEach((joinedPlayer) => {
    if (realPlayer !== joinedPlayer) {
      joinedPlayer.red({ kenoProMax: { player } });
    }
  });
};

module.exports = (realPlayer) => {
  const kenoProMaxData = realPlayer.redT.kenoProMax;

  if (kenoProMaxData.realPlayers[realPlayer.UID] === realPlayer) {
    inGame(realPlayer, kenoProMaxData).catch((error) => Logger.logError(error));
  } else {
    realPlayer.red({ toGame: "MainGame" });
  }
};
