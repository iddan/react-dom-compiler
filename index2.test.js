const Babel = require('babel-core')
const plugin = require('./index2')

const transform = (code) => Babel.transform(code, {
  plugins: [
    'babel-plugin-syntax-class-properties',
    'babel-plugin-syntax-jsx',
    plugin,
  ]
}).code

const rootNode = document.createElement('div')
rootNode.id = 'root'
document.body.appendChild(rootNode)
rootNode.appendChild(document.createTextNode('text before'))

test('Arrow function of static JSXElement and JSXText', () => {
  const transformed = transform(`
const A = ({ name }) => (
  <div>hello { name }</div>
)
ReactDOM.render(<A name="Iddan" />, document.querySelector('#root'))
  `)
  eval(transformed)
  expect(document.body.innerHTML).toBe('<div id="root"><div>hello Iddan</div></div>')
})

test('Arrow function of static JSXElement, child JSXElement and JSXText', () => {
  const transformed = transform(`
const A = ({ name }) => (
  <div name="example">hello <span>{ name }</span></div>
)
ReactDOM.render(<A name="Iddan" />, document.querySelector('#root'))
  `)
  eval(transformed)
  expect(document.body.innerHTML).toBe('<div id="root"><div name="example">hello <span>Iddan</span></div></div>')
})

test('Arrow function of static JSXElement and child component JSXElement of static JSXElement and JSXText', () => {
  const transformed = transform(`
const B = ({ name }) => (
  <div>hello <span>{ name }</span></div>
)

const A = ({ name }) => (
  <B name={name} />
)
ReactDOM.render(<A name="Iddan" />, document.querySelector('#root'))
  `)
  eval(transformed)
  expect(document.body.innerHTML).toBe('<div id="root"><div>hello <span>Iddan</span></div></div>')
})
