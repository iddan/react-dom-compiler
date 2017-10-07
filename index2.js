/**
 * Compile React component into vanilla DOM JS code
 */

const matches = require('lodash/fp/matches');

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

const JSX_ATTRIBUTE_NAME_MAPPINGS = {
  className: 'class',
  htmlFor: 'for',
};

const JSXElement = {
  getName: jsxElement => jsxElement.openingElement.name.name,
  getAttributes: jsxElement => jsxElement.openingElement.attributes.map(attribute => {
    const mappedName = JSX_ATTRIBUTE_NAME_MAPPINGS[attribute.name.name];
    if (mappedName) {
      return {
        ...attribute,
        name: {
          ...attribute.name,
          name: mappedName,
        },
      };
    }
    return attribute;
  }),
  isDOMElement: jsxElement => Boolean(JSXElement.getName(jsxElement).match(/[a-z]/)),
};

module.exports = function plugin({types: t}) {

  const methodCallExpression = (object, method, args) => t.callExpression(
    t.memberExpression(
      object,
      t.identifier(method),
    ),
    args,
  );

  const documentMethod = (method, args) => methodCallExpression(
    t.identifier('document'),
    method,
    args,
  );

  const createElement = type => documentMethod(
    'createElement',
    [
      t.stringLiteral(type),
    ],
  );

  const createTextNode = text => documentMethod(
    'createTextNode',
    [
      t.stringLiteral(text),
    ],
  );

  const declareConstant = (id, init) => t.variableDeclaration(
    'const',
    [
      t.variableDeclarator(
        id,
        init,
      ),
    ],
  );

  const appendChild = (parent, child) => methodCallExpression(
    parent,
    'appendChild',
    [
      child,
    ],
  );

  const jsxAttributesToObjectExpression = attributes => t.objectExpression(
    attributes.map(({name, value}) => t.objectProperty(
      t.identifier(name.name),
      value.type === 'JSXExpressionContainer' ? value.expression : value,
    )),
  );

  const jsxElementToCallExpression = jsxElement => t.callExpression(
    t.identifier(JSXElement.getName(jsxElement)),
    [jsxAttributesToObjectExpression(JSXElement.getAttributes(jsxElement))],
  );

  const selfCallingAnonymousFunction = body => t.callExpression(
    t.functionExpression(
      null,
      [],
      t.blockStatement(body),
    ),
    [],
  );

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

      ArrowFunctionExpression: path => {

        function handleJSXElement(jsxElement) {
          const elementId = path.scope.generateUidIdentifierBasedOnNode(path.node.id);
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
                    const childId = path.scope.generateUidIdentifierBasedOnNode(path.node.id);
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
                    const textNodeId = path.scope.generateUidIdentifierBasedOnNode(path.node.id);
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
                    const expressionId = path.scope.generateUidIdentifierBasedOnNode(path.node.id);
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

        path.traverse({
          JSXElement: childPath => {
            childPath.replaceWithMultiple(handleJSXElement(childPath.node));
          },
        });
      },
    },
  };
};
