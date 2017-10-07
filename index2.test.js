const Babel = require('babel-core')
const plugin = require('./index2')

const transform = (code) => Babel.transform(code, {
  plugins: [
    'babel-plugin-syntax-class-properties',
    'babel-plugin-syntax-jsx',
    plugin,
  ]
}).code

test('Arrow function of static JSXElement and JSXTest', () => {
  const rootNode = document.createElement('div')
  rootNode.id = 'root'
  document.body.appendChild(rootNode)
  rootNode.appendChild(document.createTextNode('text before'))
  const transformed = transform(`
const A = ({ name }) => (
  <div>hello { name }</div>
)
ReactDOM.render(<A name="Iddan" />, document.querySelector('#root'))
  `)
  eval(transformed)
  expect(document.body.innerHTML).toBe('<div id="root"><div>hello Iddan</div></div>')
})
