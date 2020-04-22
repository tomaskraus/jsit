/**
 * Everything about single line testing
 * 
 * @module evalProc
 */

const { compose, curry } = require('folktale/core/lambda')
const { map, chain } = require('pointfree-fantasy')
const Result = require('folktale/result')
const L = require('lenses')
const lp = require("./lineProc")


// lenses   for evaluation-param 
const lens = L.makeLenses(['blockTestLineNum', 'vars'])

// regexes ----------------------------

const beginTestCommentRegex = /^\s*\/\/:::.*/s
const endTestCommentRegex = /^\s*$|^\s*\*/s      //matches also "*". This is for tests inside documentation-block comment

const varRegex = /^\s*(const|let|var)\s+/s

// handlers ----------------------------
// ctx -> Result ctx ctx

// Result ctx ctx -> Result ctx ctx
const _createChainFilterTestLine = beginTestBlockHandler => 
    chain(lp.filters.createCustomBlockFilter(beginTestCommentRegex, endTestCommentRegex,
        lens.blockTestLineNum, {onBlockBegin: compose(chain(beginTestBlockHandler), _resetVarsHandler)}))

const createTestLineInBlockHandler = beginTestBlockHandler => compose.all(
    map(_addVarMapper),
    chain(_detectVarHandler),
    _createChainFilterTestLine(beginTestBlockHandler),
    lp.filters.JSBlockComment,
)

const createTestLineInLineCommentHandler = beginTestBlockHandler => compose.all(
    map(_addVarMapper),
    chain(_detectVarHandler),
    map(lp.mappers.removeLineComment),
    _createChainFilterTestLine(beginTestBlockHandler),
    lp.filters.lineComment,
)

const printBeginTestOutputHandler = ctx => {
    const ctx2 = lp.mappers.addLineNum(ctx)
    const ln = removeBeginTestBlockComment(L.view(lp.lens.output, ctx2)).trim()
    if (ln) {
        console.log(ln)
    }
    return Result.Error(ctx)
}

const _detectVarHandler = ctx => {
    const line = L.view(lp.lens.output, ctx)
    if (varRegex.test(line)) {
        const s_line = removeLineCommentAtTheEnd(line).trim()
        return Result.Error(L.over(lens.vars, s => `${s}${s_line}; `, ctx))
    }
    return Result.Ok(ctx)
}

const _resetVarsHandler = ctx => Result.Ok(L.set(lens.vars, '', ctx))

// mappers
// ctx -> ctx

const _addVarMapper = ctx => L.over(lp.lens.output, s => `${L.view(lens.vars, ctx)}/*ENDVAR*/; ${s}`, ctx)

// line transformers  
// str -> str

const removeBeginTestBlockComment = line => line.replace(/^(\s*\/\/:::)\s*(.*$)/, "$2")

const removeLineCommentAtTheEnd = line => line.replace(/^(.*)\/\/.*$/, "$1")


//----------------------------------------------------------------------------------

const logFailMessage = (ctx, msg) => `FAIL | ${ctx.lineNum} | ${ctx.fileName}:${ctx.lineNum} | ${msg} | ${ctx.output}`

// ctx -> Result ctx
const createTestHandler = evaluatorObj => {
    // lp.log2("eh", ctx)
    const testLineInBlockHandler = createTestLineInBlockHandler(printBeginTestOutputHandler)
    const testLineInLineCommentHandler = createTestLineInLineCommentHandler(printBeginTestOutputHandler)
    return ctx => testLineInBlockHandler(ctx)
        .orElse(ctx => {
            if (lp.isInBlock(lp.lens.JSBlockCommentLineNum, ctx)) {
                return Result.Error(ctx)
            }
            return testLineInLineCommentHandler(ctx)
        })
        .chain(ctx => {
            // lp.log2("line", ctx)
            try {
                // ctx.stats.totalCount++
                const testPassed = evaluatorObj.eval(L.view(lp.lens.output, ctx))
                if (testPassed === false) {
                    console.log(logFailMessage(ctx, "The result is false"))
                    // ctx.stats.failCount++
                    return Result.Error(ctx)
                }
                return Result.Ok(ctx)
            } catch (e) {
                // ctx.stats.failCount++
                console.log(logFailMessage(ctx, e))
                return Result.Error(ctx)
            }
        })
}


//==================================================================================

module.exports = {
    factory: {
        createTestHandler,
    },

    regex: {
        beginTestComment: beginTestCommentRegex,
        endTestComment: endTestCommentRegex,
    },

}
