const matches = require('lodash/fp/matches');
const JSXElement = require('./jsx-element')
const {
  methodCallExpression,
  documentMethod,
  createElement,
  createTextNode,
  declareConstant,
  appendChild,
  jsxAttributesToObjectExpression,
  jsxElementToCallExpression,
  selfCallingAnonymousFunction,
} = require('./babel-util')

const isReactDOMRender = matches({
  callee: {
    object: {
      name: 'ReactDOM',
    },
    property: {
      name: 'render',
    },
  },
});

module.exports = function plugin({types: t}) {
  // const isClassComponent = node => node.superClass.name === 'Component';

  return {
    visitor: {

      CallExpression: path => {
        if (isReactDOMRender(path.node)) {
          const [jsxElement, rootNode] = path.node.arguments;
          const child = t.identifier('child');
          path.replaceWithMultiple([
            t.forOfStatement(
              t.variableDeclaration('const', [t.variableDeclarator(child)]),
              t.memberExpression(
                rootNode,
                t.identifier('childNodes'),
              ),
              t.blockStatement([
                t.expressionStatement(methodCallExpression(child, 'remove', [])),
              ]),
            ),
            appendChild(
              rootNode,
              jsxElementToCallExpression(jsxElement),
            ),
          ]);
        }
      },

      // ClassDeclaration: (path) => {
      //   if (isClassComponent(path.node)) {
      //     path.node.body.body = path.node.body.body.map(node => {
      //       if (matches({ type: 'ClassMethod', key: { name: 'render' } }, node)) {
      //         node.body.body = node.body.body.map(childNode => {
      //           console.log(childNode)
      //         })
      //       }
      //       return node
      //     })
      //   }
      // },

      JSXElement: childPath => {
        function handleJSXElement(jsxElement) {
          const elementId = childPath.scope.generateUidIdentifierBasedOnNode(childPath.node.id);
          if (JSXElement.isDOMElement(jsxElement)) {
            return selfCallingAnonymousFunction([
              declareConstant(elementId, createElement(JSXElement.getName(jsxElement))),
              ...JSXElement.getAttributes(jsxElement).map(attribute => (
                t.expressionStatement(methodCallExpression(elementId, 'setAttribute', [
                  t.stringLiteral(attribute.name.name),
                  attribute.value,
                ]))
              )),
              ...jsxElement.children.reduce((acc, child) => {
                switch (child.type) {
                  case 'JSXElement': {
                    const childId = childPath.scope.generateUidIdentifierBasedOnNode(childPath.node.id);
                    return [
                      ...acc,
                      declareConstant(childId, handleJSXElement(child)),
                      t.expressionStatement(appendChild(
                        elementId,
                        childId,
                      )),
                    ];
                  }
                  case 'JSXText': {
                    const textNodeId = childPath.scope.generateUidIdentifierBasedOnNode(childPath.node.id);
                    return [
                      ...acc,
                      declareConstant(
                        textNodeId,
                        createTextNode(child.value),
                      ),
                      t.expressionStatement(appendChild(
                        elementId,
                        textNodeId,
                      )),
                    ];
                  }
                  case 'JSXExpressionContainer': {
                    const expressionId = childPath.scope.generateUidIdentifierBasedOnNode(childPath.node.id);
                    return [
                      ...acc,
                      declareConstant(
                        expressionId,
                        child.expression,
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
                                  expressionId,
                                ],
                              ),
                            )),
                            t.breakStatement(),
                          ])]),
                          t.switchCase(t.stringLiteral('object'), [t.blockStatement([
                            t.ifStatement(
                              t.unaryExpression('!', t.binaryExpression('instanceof', expressionId, t.identifier('Node'))),
                              t.blockStatement([
                                t.throwStatement(t.newExpression(t.identifier('Error'), [
                                  t.stringLiteral('Objects can not be passed as children'),
                                ])),
                              ]),
                            ),
                            t.breakStatement(),
                          ])]),
                        ],
                      ),
                    ];
                    // break;
                  }
                  default: {
                    return acc;
                  }
                }
              }, []),
              t.returnStatement(elementId),
            ]);
          }
          return jsxElementToCallExpression(jsxElement);
        }

        childPath.replaceWith(handleJSXElement(childPath.node));
      },
    },
  };
};
