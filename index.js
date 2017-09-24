const fs = require('fs')
const { Script } = require('vm')
const { promisify } = require('util')
const { JSDOM } = require('jsdom')
const Babel = require('babel-core')

const readFile = promisify(fs.readFile)

const transformToStandardJS = (esNextCode) => {
  const { code } = Babel.transform(esNextCode, {
    plugins: [
      'babel-plugin-transform-class-properties',
      'babel-plugin-transform-react-jsx',
      'babel-plugin-transform-es2015-modules-commonjs'
    ]
  })
  return code
}

const spy = (object, methodName, callback) => {
  const method = object[methodName]
  object[methodName] = function(...args) {
    const value = method.apply(this, args)
    callback({ context: this, args, value })
    return value
  }
}

const spyObject = (object, callback) => {
  for (const key of Object.keys(object)) {
    let value
    try {
      value = object[key]
    } catch (err) {
      continue
    }
    if (typeof value === 'function') {
      spy(object, key, data => callback({ method: key, ...data }))
    }
  }
}

const TARGET_ID = Symbol('TARGET_ID')

async function convert(filename) {
  const fileContent = await readFile(filename, 'utf-8')
  const dom = new JSDOM(`<div id="root"></div>`, { runScripts: 'outside-only' })
  dom.window.require = require
  dom.window.console = console
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = {
    userAgent: 'node.js',
  };
  let mutations = []
  const rootNode = document.querySelector('#root')
  rootNode[TARGET_ID] = 'rootNode'
  let targets = {
    'rootNode': {
      tagName: 'div',
      attributes: {
        id: 'root'
      }
    },
  }
  spyObject(dom.window.Document.prototype, ({ method, args, value }) => {
    switch (method) {
      case 'createElement': {
        const { tagName } = value
        const id = Object.keys(targets).length
        value[TARGET_ID] = id
        targets[id] = {
          tagName,
          attributes: []
        }
      }
      case 'createEvent': {
        return
      }
    }
    mutations.push({
      target: 'document',
      method,
      args,
    })
  })
  for (const interface of [dom.window.Node, dom.window.EventTarget]) {
    spyObject(interface.prototype, ({ context, method, args }) => {
      mutations.push({
        target: context[TARGET_ID],
        method,
        args,
      })
    })
  }
  
  dom.runVMScript(new Script(transformToStandardJS(fileContent)))
  // observer.disconnect();  

  const { code } = Babel.transform(fileContent, {
    plugins: [
      'babel-plugin-syntax-class-properties',
      'babel-plugin-syntax-jsx',
      function(babel) {
        const t = babel.types
        return {
          visitor: {
            VariableDeclarator(path, state) {
              if (
                path.node.init.name === 'React' ||
                path.node.id.type === 'Identifier' && ['React', 'ReactDOM'].includes(path.node.id.name) ||
                path.node.id.type === 'ObjectPattern' && path.node.id.properties.find(property => ['React', 'ReactDOM'].includes(property.key.name ))
              ) {
                path.remove()
              }
            },
            CallExpression(path, state) {
              const { callee } = path.node
              if (callee.type === 'MemberExpression' && callee.object.name === 'ReactDOM' && callee.property.name === 'render') {
                path.remove()
              }
            },
            ClassDeclaration(path, state) {
              if (path.node.superClass.name === 'Component') {
                const blockStatement = t.blockStatement([])
                for (const child of path.node.body.body) {
                  switch (child.type) {
                    case 'ClassProperty': {
                      switch(child.value.type) {
                        case 'ArrowFunctionExpression': {
                          const variableDeclarator = t.variableDeclarator(t.identifier(child.key.name), child.value)
                          const variableDeclaration = t.variableDeclaration('const', [variableDeclarator])
                          blockStatement.body.push(variableDeclaration)
                          // child.remove()
                        }
                        default: {
                          // console.log(child)
                        }
                      }
                      break;
                    }
                    case 'ClassMethod': {
                      // console.log(child)
                      break;
                    }
                  }
                }
                for (const [id, target] of Object.entries(targets)) {
                  const targetIdentifier = t.identifier('target_' + id)
                  blockStatement.body.push(
                    t.variableDeclaration('const', [
                      t.variableDeclarator(
                        targetIdentifier,
                        t.callExpression(
                          t.memberExpression(
                            t.identifier('document'),
                            t.identifier('createElement')
                          ),
                          [
                            t.stringLiteral(target.tagName)
                          ]
                        )
                      )
                    ])
                  )
                  for (const [key, value] of Object.entries(target.attributes)) {
                    blockStatement.body.push(
                      t.callExpression(
                        t.memberExpression(
                          targetIdentifier,
                          t.identifier('setAttribute')
                        ),
                        [
                          t.stringLiteral(key),
                          t.stringLiteral(String(value)),
                        ]
                      )
                    )
                  }
                }
                for (const mutation of mutations) {
                  if (!mutation.target) {
                    continue
                  }
                  blockStatement.body.push(
                    t.callExpression(
                      t.memberExpression(
                        t.identifier('target_' + mutation.target),
                        t.identifier(mutation.method)
                      ),
                      mutation.args.map(arg => {
                        switch (typeof arg) {
                          case 'string': {
                            return t.stringLiteral(arg)
                          }
                          case 'object': {
                            if (arg === null) {
                              return t.nullLiteral()
                            }
                            if (arg[TARGET_ID]) {
                              return t.identifier('target_' + arg[TARGET_ID])
                            }
                          }
                          case 'boolean': {
                            return t.booleanLiteral(arg)
                          }
                          case 'function': {
                            console.log(arg.name)
                          }
                          default: {
                            console.log('couldn\'t parse ', mutation.method, arg)
                            return t.stringLiteral('')
                          }
                        }
                      })
                    )
                  )
                }
                const functionDeclaration = t.functionDeclaration(
                  t.identifier(path.node.id.name),
                  [
                    t.identifier('props')
                  ],
                  blockStatement,
                  false,
                  false,
                )
                path.remove()
                path.parent.body.push(functionDeclaration)
              }
            }
          }
        }
      }
    ]
  })
  return code;
}

convert(require.resolve('./example.js')).then(console.log).catch(console.error)
