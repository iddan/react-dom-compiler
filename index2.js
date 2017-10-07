const Babel = require('babel-core')
const matches = require('lodash/fp/matches')

const exampleInputCode = `
const A = ({ name }) => (
  <div>hello{ name }</div>
)

ReactDOM.render(<A />, document.querySelector('#root'))
`

const isReactDOMRender = matches({
  callee: {
    object: {
      name: 'ReactDOM',
    },
    property: {
      name: 'render'
    }
  },
})

const JSXElement = {
  getName: (jsxElement) => jsxElement.openingElement.name.name,
  isDOMElement: (jsxElement) => Boolean(JSXElement.getName(jsxElement).match(/[a-z]/))
}

function plugin({ types: t }) {

  const methodCallExpression = (object, method, arguments) => t.callExpression(
    t.memberExpression(
      object,
      t.identifier(method)
    ),
    arguments
  )

  const documentMethod = (method, arguments) => methodCallExpression(
    t.identifier('document'),
    method,
    arguments
  )

  const createElement = (type) => documentMethod(
    'createElement',
    [
      t.stringLiteral(type)
    ]
  )

  const createTextNode = (text) => documentMethod(
    'createTextNode',
    [
      t.stringLiteral(text)
    ]
  )

  const declareConstant = (id, init) => t.variableDeclaration(
    'const',
    [
      t.variableDeclarator(
        id,
        init
      )
    ]
  )

  const appendChild = (parent, child) => methodCallExpression(
    parent,
    'appendChild',
    [
      child
    ]
  )

  return {
    visitor: {

      CallExpression: (path) => {
        if (isReactDOMRender(path.node)) {
          const [jsxElement, rootNode] = path.node.arguments
          path.replaceWith(
            appendChild(
              rootNode,
              t.callExpression(
                t.memberExpression(
                  t.newExpression(
                    // yes i know this is stupid, im lazy
                    t.identifier(JSXElement.getName(jsxElement)),
                    [],
                  ),
                  t.identifier('render')
                ),
                []
              )
            )
          )
        }
      },

      ArrowFunctionExpression: (path) => {
        switch(path.node.body.type) {
          case 'JSXElement': {
            function handleJSXElement(jsxElement) {
              if (JSXElement.isDOMElement(jsxElement)) {
                const elementId = path.scope.generateUidIdentifierBasedOnNode(path.node.id)
                return [
                  declareConstant(elementId, createElement(JSXElement.getName(jsxElement))),
                  ...jsxElement.children.reduce((acc, child) => {
                    switch (child.type) {
                      case 'JSXElement': {
                        // handleJSXElement(child)
                        // break;
                      }
                      case 'JSXText': {
                        const textNodeId = path.scope.generateUidIdentifierBasedOnNode(path.node.id)
                        return [
                          ...acc,
                          declareConstant(
                            textNodeId,
                            createTextNode(child.value)
                          ),
                          t.expressionStatement(appendChild(
                            elementId,
                            textNodeId
                          )),
                        ]
                      }
                      case 'JSXExpressionContainer': {
                        switch (child.expression.type) {
                          case 'Identifier': {
                            const identifier = child.expression
                            const identifierId = path.scope.generateUidIdentifierBasedOnNode(path.node.id)
                            return [
                              ...acc,
                              t.ifStatement(
                                identifier,
                                t.blockStatement([
                                  declareConstant(
                                    identifierId,
                                    documentMethod(
                                      'createTextNode',
                                      [
                                        identifier
                                      ]
                                    )
                                  ),
                                  t.expressionStatement(appendChild(
                                    elementId,
                                    identifierId
                                  )),
                                ])
                              )
                            ]
                          }
                        }
                        // break;
                      }
                      default: {
                        return acc
                      }
                    }
                  }, []),
                  t.returnStatement(elementId)
                ]
              }
            }
    
            const { parentBlock } = path.scope
            if (matches({ type: 'VariableDeclarator', init: { type: 'ArrowFunctionExpression' } }, parentBlock)) {
              const { body } = parentBlock.init
              if (matches({ type: 'JSXElement' }, body)) {
                path.parentPath.parentPath.replaceWith(
                  t.classDeclaration(
                    parentBlock.id,
                    null,
                    t.classBody([
                      t.classMethod(
                        'method',
                        t.identifier('render'),
                        [],
                        t.blockStatement(handleJSXElement(body))
                      )
                    ]),
                    []
                  )
                )
              }
            }
          }
        }
      },
    }
  }
}

const { code } = Babel.transform(exampleInputCode, {
  plugins: [
    'babel-plugin-syntax-class-properties',
    'babel-plugin-syntax-jsx',
    plugin,
  ]
})

console.log(code)
