module.exports = (realPlayer) => {
  const kenoProMaxData = realPlayer.redT.kenoProMax;

  if (kenoProMaxData.realPlayers[realPlayer.UID] === realPlayer) {
    delete kenoProMaxData.realPlayers[realPlayer.UID];
    delete kenoProMaxData.players[realPlayer.UID];

    Object.values(kenoProMaxData.realPlayers).forEach((joinedPlayer) => {
      if (realPlayer !== joinedPlayer) {
        joinedPlayer.red({ kenoProMax: { outgame: { playerId: realPlayer.UID } } });
      }
    });
  }
};
