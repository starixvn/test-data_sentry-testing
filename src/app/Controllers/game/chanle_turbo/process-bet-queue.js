const BalanceApi = require("./../../../apis/balanceApi");
const BetChoiceMapper = require("./../../../apis/betChoiceMapper");
const Logger = require("./../../../web/logger");
const gameIds = require("./../../../../config/appConfigs").gameIds;
const NoticeMessages = require("./../constants/notice-messages");
const ChanLeTurboCuoc = require("../../../Models/ChanLeTurbo/ChanLeTurbo_cuoc");
const ChanLeTurboCuocOne = require("../../../Models/ChanLeTurbo/ChanLeTurbo_one");

module.exports = (io) => {
  const processTimeOut = 50;

  setTimeout(function proceed() {
    proceedQueue(io);
    setTimeout(proceed, processTimeOut);
  }, processTimeOut);
};

const proceedQueue = (io) => {
  if (io.clturbo.ingame) {
    Object.values(io.clturbo.ingame).forEach((playerInGame) => {
      if (!playerInGame.betProcessing && playerInGame.betQueue && playerInGame.betQueue.length > 0) {
        const { player, payload } = playerInGame.betQueue.shift();

        playerInGame.betProcessing = true;

        proceedBet(player, payload)
          .then(() => (playerInGame.betProcessing = false))
          .catch(Logger.logError);
      }
    });
  }
};

const proceedBet = (player, payload) =>
  new Promise((resolve, reject) => {
    if (!player.redT || !player.redT.clturbo) {
      return;
    }

    const roundId = player.redT?.ChanLeTurbo_phien ?? 0;
    const select = !!payload.select;
    const amount = payload.bet >> 0;
    const betInfo = {
      gameId: gameIds.clturbo,
      gameRoundId: roundId,
      choiceId: BetChoiceMapper.convertChanLe(select),
      cuoc: amount,
      inSufficientBalance: { clturbo: { err: NoticeMessages.notEnoughMoney } },
    };

    const handleSuccessBetSync = (user, {}, updateUserRed) =>
      handleSuccessBet(player, amount, roundId, select, amount, updateUserRed).then(resolve).catch(reject);

    const handleFailedBetSync = () => {
      handleFailedBet(player, select, amount);
      resolve();
    };

    BalanceApi.placeBet({ id: player.UID }, betInfo, player, handleSuccessBetSync, handleFailedBetSync);
  });

const handleFailedBet = (player, select, amount) => {
  const name = player.profile.name;

  const gameData = player.redT.clturbo;
  if (gameData.ingame && gameData.ingame[name]) {
    const playerInGame = gameData.ingame[name];

    playerInGame.betTracks[select] -= amount;
  }
};

const handleSuccessBet = async (player, red, roundId, select, bet, updateUserRed) => {
  const existingBetFilter = { uid: player.UID, phien: roundId, red: true };
  const existingBet = await ChanLeTurboCuocOne.findOne(existingBetFilter);
  const totalBet = existingBet ? existingBet.bet + bet : bet;
  const playerBetCount = existingBet ? 0 : 1;

  await updateUserRed(async (updatedUser) => {
    await upsertBet(player, roundId, select, bet);
    await insertBetLog(player, roundId, select, bet);

    adjustGameData(player, red, select, bet, playerBetCount);
    notifyPlacingBetResult(player, red, select, totalBet, updatedUser);
  });
};

const notifyPlacingBetResult = (player, red, select, totalBet, updatedUser) => {
  const clturboVery = select ? { red_me_chan: totalBet } : { red_me_le: totalBet };

  if (player.redT && player.redT.users) {
    player.redT.users[player.UID].forEach(function (obj) {
      obj.red({
        clturbo: { clturbo: clturboVery },
        user: { red: updatedUser.red },
      });
    });
  }
};

const adjustGameData = (player, red, select, bet, playerBetCount) => {
  try {
    if (player.redT) {
      const gameData = player.redT.clturbo;
      const adminData = player.redT.clturboAdmin;
      const isUUSAccount = player.session && player.session.currency && player.session.currency.toUpperCase() === "UUS";

      if (!isUUSAccount) {
        if (select) {
          gameData.clturbo.red_chan += bet;
          adminData.clturbo.red_chan += bet;

          gameData.playerBetEvenCount += playerBetCount;
          adminData.playerBetEvenCount += playerBetCount;
        } else {
          gameData.clturbo.red_le += bet;
          adminData.clturbo.red_le += bet;

          gameData.playerBetOddCount += playerBetCount;
          adminData.playerBetOddCount += playerBetCount;
        }
      }

      adminData.list.unshift({
        name: player.profile.name,
        select: select,
        red: red,
        bet: bet,
        time: new Date(),
      });
    }
  } catch (error) {
    Logger.logError(error);
  }
};

const upsertBet = async (player, roundId, select, bet) => {
  const cuocOneCreate = { uid: player.UID, phien: roundId, red: true, select: select };

  if (player.session) {
    cuocOneCreate.memberId = player.session.memberId;
    cuocOneCreate.siteId = player.session.siteId;
  }

  await ChanLeTurboCuocOne.updateOne(
    { uid: player.UID, phien: roundId, red: true, select: select },
    { $inc: { bet: bet }, $setOnInsert: cuocOneCreate },
    { upsert: true, setDefaultsOnInsert: true }
  );
};

const insertBetLog = async (player, roundId, select, bet) => {
  let create = {
    uid: player.UID,
    name: player.profile.name,
    phien: roundId,
    bet: bet,
    taixiu: false,
    select: select,
    red: true,
    time: new Date(),
  };

  if (player.session) {
    create.memberId = player.session.memberId;
    create.siteId = player.session.siteId;
  }

  await ChanLeTurboCuoc.create(create);
};
