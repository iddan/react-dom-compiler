const React = require('react')
const ReactDOM = require('react-dom')

const { Component } = React;

class App extends Component {

  state = {
    count: 1,
  }

  handleClick = () => {
    this.setState(state => ({ count: state.count + 1 }))
  }

  render() {
    const { count } = this.state
    return <div onClick={this.handleClick}>{count}</div>
  }
}

ReactDOM.render(<App />, document.querySelector('#root'))
