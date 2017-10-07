# React DOM Compiler

Compile react-dom code to vanilla JS commands

For this code:

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

| measurement / Syntax resolver | React + React DOM   | React DOM Compiler |
| ---                           | ---                 | ---                |
| Bundle size                   | 6kb + 108kb + 135b  | 590b               |


### Prior Art
 - [Svelte](https://svelte.technology/)
 - [Preact](https://github.com/developit/preact)
