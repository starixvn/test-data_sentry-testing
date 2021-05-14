const MiniBase = require('../mini-base');
const path = require('path');

const gameNames = [
    'kenoEast',
    'kenoMax',
    'kenoMax2',
    'kenoMini',
    'kenoMini2',
    'kenoNorth',
    'kenoSouth',
    'kenoWest',
];

const getDefinition = gameName => {
    const definitionPath = path.join('../../../game/MiniKeno', gameName.substr(4), 'definition');
    const definition = require(definitionPath) || {};

    return definition;
};

const kenoGames = gameNames.map(gameName => MiniBase(gameName, getDefinition(gameName)));

module.exports = (client, data) => {
    kenoGames.forEach(handle => handle(client, data));
};
