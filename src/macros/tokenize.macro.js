const { createMacro } = require('babel-plugin-macros')
const Prism = require('prismjs')
const { parseExpression } = require('@babel/parser')
const generate = require('@babel/generator').default

module.exports = createMacro(tokenizeMacro)

function simplify(token) {
  if (typeof token === 'string') return token
  return [token.type, Array.isArray(token.content) ? token.content.map(simplify) : token.content]
}

function tokenizeMacro({ references, babel: { types: t } }) {
  references.default.forEach((path) => {
    const lang = path.parentPath.node.property.name

    const codeNode = path.parentPath.parentPath.node.arguments[0]
    const originalCode = t.isTemplateLiteral(codeNode)
      ? codeNode.quasis[0].value.cooked
      : codeNode.value

    const returnCodeNode = path.parentPath.parentPath.node.arguments[1]
    const returnCode = returnCodeNode && returnCodeNode.value

    const argsNode = path.parentPath.parentPath.node.arguments[3]
    let args = {}
    if (argsNode) {
      eval('args = ' + generate(argsNode).code)
    }

    const codeTransformerNode = path.parentPath.parentPath.node.arguments[2]
    let code = originalCode
    if (codeTransformerNode) {
      const codeTransformer = eval(generate(codeTransformerNode).code)
      code = codeTransformer(code, args)
    }

    const tokens = Prism.tokenize(code, Prism.languages[lang]).map(simplify)

    path.parentPath.parentPath.replaceWith(
      parseExpression(
        JSON.stringify({
          tokens,
          ...(returnCode ? { code: returnCode === 'original' ? originalCode : code } : {}),
          ...args,
        })
      )
    )
  })
}