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
const lens = L.makeLenses(['blockTestLineNum', 'vars', 'stats', 'numFailed', 'totalTests'])
lens.stats_numFailed = compose(lens.stats, lens.numFailed)
lens.stats_totalTests = compose(lens.stats, lens.totalTests)

// context
const createContext = () => (
    { ...lp.factory.createContext(), stats: { numFailed: 0, totalTests: 0 } }
)

// regexes ----------------------------

const beginTestCommentRegex = /^\s*\/\/:::.*/s
const endTestCommentRegex = /^\s*$/s
const endTestLineCommentRegex = /^\s*\/\/\s*$/s

const varRegex = /^\s*(const|let|var)\s+/s


// events
// { str: (ctx -> Result), ... }

const createDefaultEventSettings = () => ({
    onTestBegin: printBeginTestOutputHandler,   //begin of test block
    onTest: Result.Ok,                          //fired when inside the test
    onTestRelated: Result.Ok,                   //when inside the test-related line
    onEnd: Result.Ok,                           //fired at the very end, when flush method is called
})

// mappers
// ctx -> ctx

const _addVarMapper = ctx => L.over(lp.lens.output, s => `${L.view(lens.vars, ctx)} ${s}`, ctx)

// line transformers  
// str -> str

const removeInnerStar = line => line.replace(/(\s)*\*(.*)$/, "$1$2")

const removeBeginTestBlockComment = line => line.replace(/^(\s*\/\/:::)\s*(.*$)/, "$2")

const removeLineCommentAtTheEnd = line => line.replace(/^(.*)\/\/.*$/, "$1")

// handlers ----------------------------
// ctx -> Result ctx ctx

// Result ctx ctx -> Result ctx ctx
const _createFilterTestLine = (events, endTestCommentRegex) =>
    lp.factory.createCustomBlockFilter(beginTestCommentRegex, endTestCommentRegex,
        lens.blockTestLineNum, lp.addEventHandlerBefore(_resetVarsHandler, 'onBlockBegin', events)
    )

const filterExcludeNonTestLines = compose.all(
    chain(lp.filters.excludeOutputLine(lp.regex.blankLine)),
    lp.filters.excludeOutputLine(lp.regex.JSLineComment),
    lp.mappers.trimOutput,
)

const _createTestRelatedFilter = events => compose.all(
    map(_addVarMapper),
    chain(_detectVarHandler),
    chain(events.onTestRelated),
    filterExcludeNonTestLines,
)

const createTestLineInBlockFilter = events => compose.all(
    chain(_createTestRelatedFilter(events)),
    chain(_createFilterTestLine(events, endTestCommentRegex)),
    map(lp.mappers.liftCtxOutput(removeInnerStar)),
    lp.factory.createJSBlockCommentFilter({}),
)

const createTestLineInLineCommentFilter = events => compose.all(
    chain(_createTestRelatedFilter(events)),
    map(lp.mappers.removeLineComment),
    chain(_createFilterTestLine(events, endTestLineCommentRegex)),
    lp.filters.JSLineComment,
)

// const printEndBlock = compose.all(
//     Result.Error,
//     lp.tap(
//         () => console.log("---------------------")
//     ),
// )

const printBeginTestOutputHandler = compose.all(
    Result.Error,
    lp.tapCtx(lp.lens.output, ln => (ln)
        ? console.log(ln)
        : null
    ),
    lp.mappers.trimOutput,
    lp.mappers.liftCtxOutput(removeBeginTestBlockComment),
)


const createTestLineObj = (events) => {
    const defaultEvs = createDefaultEventSettings()
    const fullEvents = {
        ...defaultEvs, ...events,
        onBlockBegin: events.onTestBegin || defaultEvs.onTestBegin
    }
    const testLineInBlockHandler = createTestLineInBlockFilter(fullEvents)
    const testLineInLineCommentHandler = createTestLineInLineCommentFilter(fullEvents)
    return {
        filter: ctx => testLineInBlockHandler(ctx)
            .orElse(ctx =>
                lp.isInBlock(lp.lens.JSBlockCommentLineNum, ctx)
                    ? Result.Error(ctx)
                    : testLineInLineCommentHandler(ctx)
            ).chain(fullEvents.onTest),
        flush: ctx => fullEvents.onEnd(ctx)
    }
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



//----------------------------------------------------------------------------------

const failMessage = (msg, ctx) => `FAIL | ${ctx.lineNum} | ${ctx.fileName}:${ctx.lineNum} | ${msg} | ${ctx.output}`



// ctx -> Result ctx
const createTestHandler = evaluatorObj => {
    // lp.log("createTestHandler -- --")   
    const resultAddFail = ctx => Result.Error(L.over(lens.stats_numFailed, lp.inc, ctx))
    return ctx => {
        // lp.log2("line", ctx)
        const ctx2 = L.over(lens.stats_totalTests, lp.inc, ctx)
        try {
            const testPassed = evaluatorObj.eval(L.view(lp.lens.output, ctx2))
            if (testPassed === false) {
                console.log(failMessage("The result is false", ctx2))
                return resultAddFail(ctx2)
            }
            return Result.Ok(ctx2)
        } catch (e) {
            console.log(failMessage(e, ctx2))
            return resultAddFail(ctx2)
        }
    }
}


//==================================================================================

module.exports = {
    factory: {
        createTestLineObj,
        createTestHandler,
        createContext,
        createDefaultEventSettings,
    },

    lens: {
        ...lp.lens,
        stats_numFailed: lens.stats_numFailed,
        stats_totalTests: lens.stats_totalTests,
    },

    regex: {
        beginTestComment: beginTestCommentRegex,
        endTestComment: endTestCommentRegex,
    },

}
