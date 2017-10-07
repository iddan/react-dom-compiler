const t = require('babel-types')
const JSXElement = require('./jsx-element')

const methodCallExpression = exports.methodCallExpression = (object, method, args) => t.callExpression(
  t.memberExpression(
    object,
    t.identifier(method),
  ),
  args,
);

const documentMethod = exports.documentMethod = (method, args) => methodCallExpression(
  t.identifier('document'),
  method,
  args,
);

const createElement = exports.createElement = type => documentMethod(
  'createElement',
  [
    t.stringLiteral(type),
  ],
);

const createTextNode = exports.createTextNode = text => documentMethod(
  'createTextNode',
  [
    t.stringLiteral(text),
  ],
);

const declareConstant = exports.declareConstant = (id, init) => t.variableDeclaration(
  'const',
  [
    t.variableDeclarator(
      id,
      init,
    ),
  ],
);

const appendChild = exports.appendChild = (parent, child) => methodCallExpression(
  parent,
  'appendChild',
  [
    child,
  ],
);

const jsxAttributesToObjectExpression = exports.jsxAttributesToObjectExpression = attributes => t.objectExpression(
  attributes.map(({name, value}) => t.objectProperty(
    t.identifier(name.name),
    value.type === 'JSXExpressionContainer' ? value.expression : value,
  )),
);

const jsxElementToCallExpression = exports.jsxElementToCallExpression = jsxElement => t.conditionalExpression(
  t.binaryExpression(
    'instanceof',
    t.memberExpression(
      t.identifier(JSXElement.getName(jsxElement)),
      t.identifier('prototype'),
    ),
    t.memberExpression(
      t.callExpression(t.identifier('require'), [t.stringLiteral('react')]),
      t.identifier('Component'),
    )
  ),
  methodCallExpression(
    methodCallExpression(
      t.identifier('Object'),
      'assign',
      [
        t.newExpression(
          t.identifier(JSXElement.getName(jsxElement)),
          [
            jsxAttributesToObjectExpression(JSXElement.getAttributes(jsxElement)) 
          ],
        ),
        t.objectExpression([
          t.objectProperty(
            t.identifier('props'),
            jsxAttributesToObjectExpression(JSXElement.getAttributes(jsxElement))
          )
        ])
      ]
    ),
    'render',
    []
  ),
  t.callExpression(
    t.identifier(JSXElement.getName(jsxElement)),
    [jsxAttributesToObjectExpression(JSXElement.getAttributes(jsxElement))],
  ),
);

const selfCallingAnonymousFunction = exports.selfCallingAnonymousFunction = body => t.callExpression(
  t.functionExpression(
    null,
    [],
    t.blockStatement(body),
  ),
  [],
);
