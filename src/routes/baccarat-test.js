const baseCard = require('../data/card');
const BaccaratGame = require('../app/Cron/baccarat/baccarat-game');
const Helpers = require('../app/Helpers/Helpers');
const Config = require('../config/appConfigs');
const testcases = require('./baccarat-testcases.json');

const cardIcons = [
    [ '🂱', '🂲', '🂳', '🂴', '🂵', '🂶', '🂷', '🂸', '🂹', '🂺', '🂻', '🂽', '🂾', '🃟' ],
    [ '🃁', '🃂', '🃃', '🃄', '🃅', '🃆', '🃇', '🃈', '🃉', '🃊', '🃋', '🃍', '🃎', '🃟' ],
    [ '🃑', '🃒', '🃓', '🃔', '🃕', '🃖', '🃗', '🃘', '🃙', '🃚', '🃛', '🃝', '🃞', '🃟' ],
    [ '🂡', '🂢', '🂣', '🂤', '🂥', '🂦', '🂧', '🂨', '🂩', '🂪', '🂫', '🂭', '🂮', '🃟' ]
];

const convertToIcon = card => cardIcons[card.type][card.card];

const testGame = cards => {
    const joker = {card: 13, type: 0};
    const testcase = [...cards, {...joker}, {...joker}]
    const baccaratGame = new BaccaratGame(testcase);

    const actions = [{
        action: 'start',
        cards: {
            player: [],
            banker: [],
        },
        score: {
            player: '',
            banker: '',
        },
        deskOfCards: testcase.map(convertToIcon),
    }];

    while (baccaratGame.getAction() !== BaccaratGame.Actions.finalComparison) {
        const action = baccaratGame.getAction();
        baccaratGame[action]();

        actions.push({
            action,
            cards: {
                player: baccaratGame.player.getCards().map(convertToIcon),
                banker: baccaratGame.banker.getCards().map(convertToIcon),
            },
            score: {
                player: baccaratGame.player.getTotalScore(),
                banker: baccaratGame.banker.getTotalScore(),
            },
            deskOfCards: testcase.map(convertToIcon),
        });
    };

    const resultCards = [];
    const player = [...baccaratGame.player.getCards()];
    const banker = [...baccaratGame.banker.getCards()];
    while (player.length > 0 || banker.length > 0) {
        if (player.length > 0) {
            const card = player.shift();
            resultCards.push(card);
        }

        if (banker.length > 0) {
            const card = banker.shift();
            resultCards.push(card)
        }
    }
    const passed = JSON.stringify(cards) === JSON.stringify(resultCards);

    return {
        actions,
        passed
    };
}

module.exports = app => {
    app.get('/api/test/baccarat', (req, res) => {
        if (Config.env !== 'PRO') {
            res.send(testcases.map(testGame));
        } else {
            res.sendStatus(404);
        }
    });
}