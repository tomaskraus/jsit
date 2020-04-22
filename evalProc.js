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

// auxiliary
const inc = i => i + 1

// lenses   for evaluation-param 
const lens = L.makeLenses(['blockTestLineNum', 'vars', 'stats', 'numFailed', 'totalTests'])
lens.stats_numFailed = compose(lens.stats, lens.numFailed) 
lens.stats_totalTests = compose(lens.stats, lens.totalTests)

// context
const createContext = () => (
    { ...lp.createContext(), stats: { numFailed: 0, totalTests: 0 }}
)

// regexes ----------------------------

const beginTestCommentRegex = /^\s*\/\/:::.*/s
const endTestCommentRegex = /^\s*$/s

const varRegex = /^\s*(const|let|var)\s+/s

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
const _createChainFilterTestLine = beginTestBlockHandler => 
    chain(lp.filters.createCustomBlockFilter(beginTestCommentRegex, endTestCommentRegex,
        lens.blockTestLineNum, {onBlockBegin: compose(chain(beginTestBlockHandler), _resetVarsHandler)}))

const createTestLineInBlockHandler = beginTestBlockHandler => compose.all(
    map(_addVarMapper),
    chain(_detectVarHandler),
    _createChainFilterTestLine(beginTestBlockHandler),
    map(lp.mappers.liftCtxOutput(removeInnerStar)),
    lp.filters.JSBlockComment,
)

const createTestLineInLineCommentHandler = beginTestBlockHandler => compose.all(
    map(_addVarMapper),
    chain(_detectVarHandler),
    map(lp.mappers.removeLineComment),
    _createChainFilterTestLine(beginTestBlockHandler),
    lp.filters.lineComment,
)

const printBeginTestOutputHandler = compose.all(
    Result.Error,
    lp.tap(ctx => {
        let ln = L.view(lp.lens.output, ctx)
        if (ln) {
            console.log(ln)
        }
    }),
    lp.mappers.liftCtxOutput(s => s.trim()),
    lp.mappers.liftCtxOutput(removeBeginTestBlockComment),
)

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

const logFailMessage = (ctx, msg) => `FAIL | ${ctx.lineNum} | ${ctx.fileName}:${ctx.lineNum} | ${msg} | ${ctx.output}`

// ctx -> Result ctx
const createTestHandler = evaluatorObj => {
    // lp.log2("eh", ctx)
    const testLineInBlockHandler = createTestLineInBlockHandler(printBeginTestOutputHandler)
    const testLineInLineCommentHandler = createTestLineInLineCommentHandler(printBeginTestOutputHandler)
    const addFail = ctx => Result.Error(L.over(lens.stats_numFailed, inc, ctx))
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
                const ctx2 = L.over(lens.stats_totalTests, inc, ctx)
                const testPassed = evaluatorObj.eval(L.view(lp.lens.output, ctx2))
                if (testPassed === false) {
                    console.log(logFailMessage(ctx2, "The result is false"))
                    return addFail(ctx2)
                }
                return Result.Ok(ctx2)
            } catch (e) {
                console.log(logFailMessage(ctx, e))
                return addFail(ctx)
            }
        })
}


//==================================================================================

module.exports = {
    factory: {
        createTestHandler,
        createContext,
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
