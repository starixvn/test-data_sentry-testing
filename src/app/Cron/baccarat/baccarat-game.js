const Actions = {
  receiveTwoCards: "receiveTwoCards",
  playerReceiveThirdCard: "playerReceiveThirdCard",
  bankerReceiveThirdCard: "bankerReceiveThirdCard",
  finalComparison: "finalComparison"
};

class BaccaratPlayer {
  constructor() {
    this.card1 = null;
    this.card2 = null;
    this.card3 = null;
  }

  getCardValue(card) {
    if (card == null) {
      return 0;
    }

    let cardValue = card.card + 1;

    if (cardValue >= 10) {
      // Card 10, J, Q, K
      cardValue = 0;
    }

    return cardValue;
  }

  getTotalScore() {
    return [this.card1, this.card2, this.card3].reduce((result, card) => {
      const cardValue = this.getCardValue(card);

      return (result + cardValue) % 10;
    }, 0);
  }

  getThirdCardValue() {
    return this.getCardValue(this.card3);
  }

  getNumberOfCards() {
    return [this.card1, this.card2, this.card3].filter(card => !!card).length;
  }

  hasPair() {
    return this.card1.card === this.card2.card;
  }

  getCards() {
    if (this.card3) {
      return [this.card1, this.card2, this.card3];
    }

    return [this.card1, this.card2];
  }

  setCards(cards) {
    [...Array(3).keys()].forEach((index) => this[`card${index + 1}`] = null);
    cards.forEach((card, index) => {
      if (card && card.card >= 0) {
        this[`card${index + 1}`] = {
          card: card.card,
          type: card.type
        };
      }
    });
  }
}

class BaccaratGame {
  constructor(cards) {
    this.player = new BaccaratPlayer();
    this.banker = new BaccaratPlayer();
    this.cards = cards;
  }

  receiveTwoCards() {
    this.player.card1 = this.cards.shift();
    this.banker.card1 = this.cards.shift();
    this.player.card2 = this.cards.shift();
    this.banker.card2 = this.cards.shift();
  }

  playerReceiveThirdCard() {
    const card = this.cards.shift();

    this.player.card3 = card;
  }

  bankerReceiveThirdCard() {
    const card = this.cards.shift();

    this.banker.card3 = card;
  }

  finalComparison() {
    const score = this.getTotalScore();
    const numberOfCards =
      this.player.getNumberOfCards() + this.banker.getNumberOfCards();

    return {
      player: score.player > score.banker,
      banker: score.player < score.banker,
      tie: score.player === score.banker,
      big: numberOfCards === 5 || numberOfCards === 6,
      small: numberOfCards === 4,
      playerPair: this.player.hasPair(),
      bankerPair: this.banker.hasPair(),
      natural: numberOfCards === 4 && (score.player >= 8 || score.banker >= 8)
    };
  }

  getFinalCards() {
    return {
      playerCards: this.player.getCards(),
      bankerCards: this.banker.getCards(),
      playerPoint: this.player.getTotalScore(),
      bankerPoint: this.banker.getTotalScore(),
    }
  }

  getTotalScore() {
    return {
      player: this.player.getTotalScore(),
      banker: this.banker.getTotalScore()
    };
  }

  getNumberOfCards() {
    return {
      player: this.player.getNumberOfCards(),
      banker: this.banker.getNumberOfCards()
    };
  }

  getAction() {
    const numberOfCards = this.getNumberOfCards();
    const score = this.getTotalScore();

    if (numberOfCards.player < 2 || numberOfCards.banker < 2) {
      return Actions.receiveTwoCards;
    } else if (numberOfCards.player === 2 && numberOfCards.banker === 2) {
      if (score.player >= 8 || score.banker >= 8) {
        return Actions.finalComparison;
      }

      if (score.player <= 5) {
        return Actions.playerReceiveThirdCard;
      }

      // Player score: 6 or 7
      if (score.banker <= 5) {
        return Actions.bankerReceiveThirdCard;
      }

      return Actions.finalComparison;
    } else if (numberOfCards.player === 3 && numberOfCards.banker === 2) {
      const thirdCardOfPlayer = this.player.getThirdCardValue();
      const hasBankerReveiceThirdCard =
        score.banker <= 2 ||
        (score.banker === 3 && thirdCardOfPlayer !== 8) ||
        (score.banker === 4 &&
          thirdCardOfPlayer >= 2 &&
          thirdCardOfPlayer <= 7) ||
        (score.banker === 5 &&
          thirdCardOfPlayer >= 4 &&
          thirdCardOfPlayer <= 7) ||
        (score.banker === 6 &&
          thirdCardOfPlayer >= 6 &&
          thirdCardOfPlayer <= 7);

      if (hasBankerReveiceThirdCard) {
        return Actions.bankerReceiveThirdCard;
      } else {
        return Actions.finalComparison;
      }
    } else {
      return Actions.finalComparison;
    }
  }

  setResult({
    player,
    banker
  }) {
    this.player.setCards(player);
    this.banker.setCards(banker);
  }
}

BaccaratGame.Actions = Actions;

module.exports = BaccaratGame;