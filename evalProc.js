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
const lens = L.makeLenses(['blockTestLineNum'])

// regexes ----------------------------

const beginTestCommentRegex = /^\s*\/\/:::.*/s
const endTestCommentRegex = /^\s*$|^\s*\*/s      //matches also "*". This is for tests inside documentation-block comment

// handlers ----------------------------
// ctx -> Result ctx ctx

// Result ctx ctx -> Result ctx ctx
const _createChainFilterTestLine = beginTestBlockHandler => 
    chain(lp.filters.createCustomBlockFilter(beginTestCommentRegex, endTestCommentRegex,
        lens.blockTestLineNum, {onBlockBegin: beginTestBlockHandler}))

const createTestLineInBlockHandler = beginTestBlockHandler => compose.all(
    _createChainFilterTestLine(beginTestBlockHandler),
    lp.filters.JSBlockComment,
)

const createTestLineInLineCommentHandler = beginTestBlockHandler => compose.all(
    map(lp.mappers.removeLineComment),
    _createChainFilterTestLine(beginTestBlockHandler),
    lp.filters.lineComment,
)

const printBeginTestOutputHandler = ctx => {
    const ln = removeBeginTestBlockComment(L.view(lp.lens.output, ctx)).trim()
    if (ln) {
        console.log(ln)
    }
    return Result.Error(ctx)
}


// line transformers  
// str -> str

const removeBeginTestBlockComment = line => line.replace(/^(\s*\/\/:::)\s*(.*$)/, "$2")


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
