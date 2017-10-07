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
  expect(transform(`
  const A = ({ name }) => (
    <div>hello{ name }</div>
  )
  ReactDOM.render(<A />, document.querySelector('#root'))
  `)).toBe(`class A {
  render() {
    const _ref = document.createElement('div');

    const _ref2 = document.createTextNode('hello');

    _ref.appendChild(_ref2);

    if (name) {
      const _ref3 = document.createTextNode(name);

      _ref.appendChild(_ref3);
    }

    return _ref;
  }

}

document.querySelector('#root').appendChild(new A().render());`)
})
