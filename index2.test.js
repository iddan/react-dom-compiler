const Babel = require('babel-core');
const plugin = require('./index2');

const transform = code => Babel.transform(code, {
  plugins: [
    'babel-plugin-syntax-class-properties',
    'babel-plugin-syntax-jsx',
    plugin,
    'babel-plugin-transform-class-properties',
  ],
}).code;

const rootNode = document.createElement('div');
rootNode.id = 'root';
document.body.appendChild(rootNode);
rootNode.appendChild(document.createTextNode('text before'));

test('Arrow function of static JSXElement and JSXText', () => {
  const transformed = transform(`
const A = ({ name }) => (
  <div>hello { name }</div>
)

ReactDOM.render(<A name="Iddan" />, document.querySelector('#root'))
  `);
  eval(transformed);
  expect(document.body.innerHTML).toBe('<div id="root"><div>hello Iddan</div></div>');
});

test('Arrow function of static JSXElement, child JSXElement and JSXText', () => {
  const transformed = transform(`
const A = ({ name }) => (
  <div className="example">hello <span className="cool">{ name }</span></div>
)

ReactDOM.render(<A name="Iddan" />, document.querySelector('#root'))
  `);
  eval(transformed);
  expect(document.body.innerHTML).toBe('<div id="root"><div class="example">hello <span class="cool">Iddan</span></div></div>');
});

test('Arrow function of static JSXElement and child component JSXElement of static JSXElement and JSXText', () => {
  const transformed = transform(`
const B = ({ name }) => (
  <div>hello <span>{ name }</span></div>
)

const A = ({ name }) => (
  <B name={name} />
)

ReactDOM.render(<A name="Iddan" />, document.querySelector('#root'))
  `);
  eval(transformed);
  expect(document.body.innerHTML).toBe('<div id="root"><div>hello <span>Iddan</span></div></div>');
});

test('Arrow function with body', () => {
  const transformed = transform(`
  const A = ({ name }) => {
    return <div>hello { name }</div>
  }
  
  ReactDOM.render(<A name="Iddan" />, document.querySelector('#root'))
    `);
  eval(transformed);
  expect(document.body.innerHTML).toBe('<div id="root"><div>hello Iddan</div></div>');
});

test('Class component', () => {
  const transformed = transform(`
  const { Component } = require('react')
  class A extends Component {
    render() {
      const { name } = this.props
      return <div>hello { name }</div>
    }
  }
  
  ReactDOM.render(<A name="Iddan" />, document.querySelector('#root'))
    `);
  eval(transformed);
  expect(document.body.innerHTML).toBe('<div id="root"><div>hello Iddan</div></div>');
});

// test('Statefull component', () => {
//   const transformed = transform(`
// const { Component } = require('react')

// class A extends Component {
//   state = {
//     count: 0,
//   }

//   render() {
//     return <div>{this.props.name} {this.state.count}</div>
//   }
// }

// ReactDOM.render(<A name="Iddan" />, document.querySelector('#root'))
//   `)
//   eval(transformed)
//   expect(document.body.innerHTML).toBe('<div id="root"><div>hello <span>Iddan</span></div></div>')
// })
