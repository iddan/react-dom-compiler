/**
 * Compile React component into vanilla DOM JS code
 */

const matches = require('lodash/fp/matches')

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

module.exports = function plugin({ types: t }) {

  const methodCallExpression = (object, method, args) => t.callExpression(
    t.memberExpression(
      object,
      t.identifier(method)
    ),
    args
  )

  const documentMethod = (method, args) => methodCallExpression(
    t.identifier('document'),
    method,
    args
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

  const jsxAttributesToObjectExpression = (attributes) => t.objectExpression(
    attributes.map(({ name, value }) => t.objectProperty(t.identifier(name.name), value))
  )

  const jsxElementToCallExpression = (jsxElement) => t.callExpression(
    t.identifier(JSXElement.getName(jsxElement)),
    [jsxAttributesToObjectExpression(jsxElement.openingElement.attributes)]
  )

  return {
    visitor: {

      CallExpression: (path) => {
        if (isReactDOMRender(path.node)) {
          const [jsxElement, rootNode] = path.node.arguments
          const child = t.identifier('child')
          path.replaceWithMultiple([
            t.forOfStatement(
              t.variableDeclaration('const', [t.variableDeclarator(child)]),
              t.memberExpression(
                rootNode,
                t.identifier('childNodes')
              ),
              t.blockStatement([
                t.expressionStatement(methodCallExpression(child, 'remove', []))
              ])
            ),
            appendChild(
              rootNode,
              jsxElementToCallExpression(jsxElement)
            )
          ])
        }
      },

      ArrowFunctionExpression: (path) => {
        switch(path.node.body.type) {
          case 'JSXElement': {
            function handleJSXElement(jsxElement, elementId = path.scope.generateUidIdentifierBasedOnNode(path.node.id)) {
              if (JSXElement.isDOMElement(jsxElement)) {
                return [
                  declareConstant(elementId, createElement(JSXElement.getName(jsxElement))),
                  ...jsxElement.children.reduce((acc, child) => {
                    switch (child.type) {
                      case 'JSXElement': {
                        const childId = path.scope.generateUidIdentifierBasedOnNode(path.node.id)
                        return [
                          ...acc,
                          ...handleJSXElement(child, childId),
                          t.expressionStatement(appendChild(
                            elementId,
                            childId
                          ))
                        ]
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
                        const expressionId = path.scope.generateUidIdentifierBasedOnNode(path.node.id)
                        return [
                          ...acc,
                          declareConstant(
                            expressionId,
                            child.expression
                          ),
                          t.switchStatement(
                            t.unaryExpression('typeof', expressionId),
                            [
                              t.switchCase(t.stringLiteral('number'), []),
                              t.switchCase(t.stringLiteral('string'), [t.blockStatement([
                                t.expressionStatement(appendChild(
                                  elementId,
                                  documentMethod(
                                    'createTextNode',
                                    [
                                      expressionId
                                    ]
                                  )
                                )),
                                t.breakStatement()
                              ])]),
                              t.switchCase(t.stringLiteral('object'), [t.blockStatement([
                                t.ifStatement(expressionId, t.blockStatement([
                                  t.throwStatement(t.newExpression(t.identifier('Error'), [
                                    t.stringLiteral('Objects can not be passed as children')
                                  ]))
                                ])),
                                t.breakStatement()
                              ])])
                            ]
                          ),
                        ]
                        // break;
                      }
                      default: {
                        return acc
                      }
                    }
                  }, []),
                ]
              }
            }
    
            const { parentBlock } = path.scope
            if (matches({ type: 'VariableDeclarator', init: { type: 'ArrowFunctionExpression' } }, parentBlock)) {
              const { body } = parentBlock.init
              if (matches({ type: 'JSXElement' }, body)) {
                const statements = handleJSXElement(body)
                const [declaration] = statements
                const [declarator] = declaration.declarations
                path.node.body = t.blockStatement([
                  ...statements,
                  t.returnStatement(declarator.id)
                ])
              }
            }
          }
        }
      },
    }
  }
}
