module.exports = (client) => {
  const baccarat = client.redT.game.baccarat;

  if (baccarat.realPlayers[client.UID] === client) {
    delete baccarat.realPlayers[client.UID];
    delete baccarat.players[client.UID];

    Object.values(baccarat.realPlayers).forEach((user) => {
      if (client !== user) {
        user.red({ baccarat: { outgame: { playerId: client.UID } } });
      }
    });
  }
};
