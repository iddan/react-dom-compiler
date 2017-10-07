const App = ({ name }) => (
  <div>
    hello {name}
  </div>
)

ReactDOM.render(<App name="name" />, document.querySelector('#root'))
