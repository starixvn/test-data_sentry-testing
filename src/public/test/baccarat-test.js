'use strict';

const actionMapper = {
    receiveTwoCards: "Get Cards",
    playerReceiveThirdCard: "Player Get Card",
    bankerReceiveThirdCard: "Banker Get Card",
    finalComparison: "END",
    start: "START"
}

const Card = props => {
    const {cards, score} = props;

    return <div className='user'>
        <div className='card'>{cards.reduce((a, b) => a + b, '')}</div>
        <div className='score'>{score}</div>
    </div>;
}

const DeskOfCards = props => {
    const { cards } = props;
    
    return <div className='desk-of-cards'>
        <div className='card'>{cards.reduce((a, b) => a + b, '')}</div>
    </div>;
}

const PlayerAndBankerCards = props => {
    const { player, banker } = props.cards;
    const score = props.score;

    return <React.Fragment>
        <Card cards={player} score={score.player} key={0} />
        <Card cards={banker} score={score.banker} key={1} />
    </React.Fragment>;
}

class ResultTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = { data: [] };
  }

  componentDidMount() {
      axios.get('/api/test/baccarat')
        .then(res => res.data)
        .then(data => {
            this.setState({data});
        })
  }

  renderRound(round, key) {
      if (round) {
          const {actions, passed} = round;
          return <div key={key} className='game'>
            <div className={'status' + (passed ? 'passed' : 'fail')}>{passed ? '✅' : '🚫'}</div>
            {actions.map(({action, cards, score, deskOfCards}, index) => {
                return <div key={index} className='turn'>
                    <div className='action'>{actionMapper[action]}</div>
                    <PlayerAndBankerCards cards={cards} score={score}/>
                    <DeskOfCards cards={deskOfCards} />
                </div>
            })}
            <hr></hr>
          </div>;
      }

      return <p>Empty</p>
  }

  render() {
    return <div>
        {this.state.data.map(this.renderRound)}
    </div>;
  }
}

const e = React.createElement;
const domContainer = document.querySelector('#result');
ReactDOM.render(e(ResultTable), domContainer);