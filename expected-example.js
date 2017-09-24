function App(props) {
  const root = document.querySelector('div')
  let state = {
    count: 0
  }
  
  const handleClick = () => {
    state = { count: state.count + 1 }
    setTimeout(() => {
      node2.nodeValue = state.count
    })
  }
  
  const node1 = document.createElement('div')
  const node2 = document.createTextNode()
  
  node1.appendChild(node2)
  node1.addEventListener(handleClick)
  return node1;
}

root.appendChild(App())
