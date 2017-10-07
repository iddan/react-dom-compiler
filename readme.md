# React Compiler

Use React syntax for building UIs without using React

Transforming this code:

```jsx
import React from 'react'
import ReactDOM from 'render'

const App = ({ name }) => (
  <div>
    hello {name}
  </div>
)

ReactDOM.render(<App />, document.querySelector('#root'))
```

| measurement / Syntax resolver | React + React DOM   | React Compiler |
| ---                           | ---                 | ---            |
| Bundle size                   | 6kb + 108kb + 135b  | 1kb            |


### Prior Art
 - [Svelte](https://svelte.technology/)
 - [Preact](https://github.com/developit/preact)
