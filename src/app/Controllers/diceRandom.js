const Chance = require('chance');
const randomLib1 = require('random');
const Random = require("random-js").Random;

function random1() {
    return Math.floor(Math.random() * 6) + 1;
}

function random2() {
    const chance = new Chance();
    return chance.d6();
}

function random3() {
    const chance = new Chance();
    return chance.integer({ min: 1, max: 6 });
}

function random4() {
    return randomLib1.int(1, 6);
}

function random5() {
    const random = new Random(MersenneTwister19937.autoSeed());
    return random.integer(1, 6);
}

const randomFunctions = [
    random1,
    random2,
    random3,
    random4,
    random5
]

function random() {
    const selectedRandomMethodIndex = Math.floor(Math.random() * (randomFunctions.length - 1));
    const randomFuntion = randomFunctions[selectedRandomMethodIndex];

    return randomFuntion();
}

function randomBC() {
    let resultArray = [];
    for (let index = 0; index < 100; index++) {
        resultArray.push(random() - 1);
    }

    const bc1 = resultArray[Math.floor(Math.random() * (resultArray.length - 1))];
    const bc2 = resultArray[Math.floor(Math.random() * (resultArray.length - 1))];
    const bc3 = resultArray[Math.floor(Math.random() * (resultArray.length - 1))];

    return [bc1, bc2, bc3];
}

function test(isTX) {
    let result = '';

    for (i = 0; i <= 10000; i++) {
        const d1 = random();
        const d2 = random();
        const d3 = random();

        if (isTX) {
            result += ((d1 + d2 + d3) >= 11) ? '&#9726;' : '&#x25FD;';
        }
        else {
            result += ((d1 + d2 + d3) % 2 == 0) ? '&#9726;' : '&#x25FD;';
        }
    }

    return result;
}

function testBC() {
    let result = '';

    for (i = 0; i <= 1000; i++) {
        const bcArray = randomBC();

        bcArray.sort((a, b) => a - b);

        result += `${bcArray[0]}${bcArray[1]}${bcArray[2]}&nbsp; `;
    }

    return result;
}

module.exports = {
    random,
    randomBC,
    test,
    testBC
};