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

const beginTestCommentMark = /^\s*:::.*/s
const endTestCommentMark = /^\s*$|^\s*\*/s      //matches also "*". This is for tests inside documentation-block comment

// handlers ----------------------------
// ctx -> Result ctx

const filterTestLineInBlockHandler = beginTestBlockHandler => compose.all(
    chain(lp.filters.filterExcludeOutputLine(lp.regex.lineComment)), //removes line-commented lines in the test block
    chain(lp.filters.filterBlockComment(beginTestCommentMark, endTestCommentMark,
        lens.blockTestLineNum, beginTestBlockHandler)),
    lp.handlers.filterBlockHandler,
)

const filterTestLineInLineCommentHandler = beginTestBlockHandler => compose.all(
    chain(lp.filters.filterExcludeOutputLine(lp.regex.lineComment)), //removes line-commented lines in the test block
    chain(lp.filters.filterBlockComment(beginTestCommentMark, endTestCommentMark,
        lens.blockTestLineNum, beginTestBlockHandler)),
    map(lp.mappers.removeLineComment),
    lp.handlers.filterLineCommentHandler,
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

const removeBeginTestBlockComment = line => line.replace(/^(\s*:::)\s*(.*$)/, "$2")


//----------------------------------------------------------------------------------

const logFailMessage = (ctx, msg) => `FAIL | ${ctx.lineNum} | ${ctx.fileName}:${ctx.lineNum} | ${msg} | ${ctx.output}`

// ctx -> Result ctx
const createTestHandler = evaluatorObj => ctx => {
    // lp.log2("eh", ctx)
    return filterTestLineInBlockHandler(printBeginTestOutputHandler)(ctx)
    // return filterTestLineInLineCommentHandler(printBeginTestOutputHandler)(ctx)
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
    //ctx -> Result ctx
    handlers: {
        filterTestLineInBlockHandler,
        printBeginTestOutputHandler,
    },

    factory: {
        createTestHandler,
    },

    regex: {
        beginTestCommentMark,
        endTestCommentMark,
    },

}
