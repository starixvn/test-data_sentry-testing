const Chance = require('chance');
const randomLib1 = require('random');
const { Random, MersenneTwister19937 } = require("random-js");
const Constants = require("./constants");

function random1(min, max) {
    return Math.floor(Math.random() * max) + min;
}

function random2(min, max) {
    const chance = new Chance();
    return chance.natural({ min: min, max: max });
}

function random3(min, max) {
    const chance = new Chance();
    return chance.integer({ min: min, max: max });
}

function random4(min, max) {
    return randomLib1.int(min, max);
}

function random5(min, max) {
    const randomJs = new Random(MersenneTwister19937.autoSeed());
    return randomJs.integer(min, max);
}

const randomFunctions = [
    random1,
    random2,
    random3,
    random4,
    random5
]

module.exports = () => {
    const selectedRandomMethodIndex = Math.floor(Math.random() * (randomFunctions.length - 1));
    const randomFuntion = randomFunctions[selectedRandomMethodIndex];

    return randomFuntion(Constants.numberWheel.min, Constants.numberWheel.max);
}