/**
 * Everything about single line processing
 * 
 * @module lineProcessor
 */


const { compose, curry } = require('folktale/core/lambda')
const { map, chain } = require('pointfree-fantasy')
const Result = require('folktale/result')
const L = require('lenses')

//--auxiliary pointfree------------------------------------------------------------------------------


//resultOkErrorIf :: a -> a -> (_ -> bool) -> Result a a
const resultOkErrorIf = curry(3,
    (OkVal, ErrorVal, fn) => fn ? Result.Ok(OkVal)
        : Result.Error(ErrorVal)
)

const tap = curry(2, (fn, a) => {
    fn(a)
    return a
})

const log2 = curry(2, (descr, a) => tap(s => console.log(`LOG ${descr}:`, s), a)
)

const log = log2("")

//--------------------------------------------------------------------------------

const createContext = () => ({
    lineNum: 0,
    // stats: {
    //     failCount: 0,
    //     totalCount: 0
    // },

    // input: "",
    // output: "",
})

// context lenses
const ctxL = L.makeLenses(['input', 'output', 'lineNum', 'blockMode', 'testBlockMode', 'lastContinuousLineNum'])

//--------------------------------------------------------------------------------

const impure = {}


impure.prettyPrint = ctx => {
    console.log(`${ctx.lineNum}: ${ctx.output}`)
    return ctx
}


// regexes ----------------------------

const lineCommentRegex = /^\s*\/\//s
// TODO: add detection of one-line  block comment /*    */
const beginJSBlockCommentMark = /^\s*\/\*/s
const endJSBlockCommentMark = /^\s*\*\//s

const beginTestCommentMark = /^\s*:::.*/s
const endTestCommentMark = /^\s*$|^\s*\*/s      //matches also "*". This is for tests inside documentation-block comment


// filters -----------------------------------
// ... -> ctx -> Result ctx


// filterLine :: (context ctx, Result Res) => regex -> ctx -> Res ctx ctx
const filterLine = regex => ctx => resultOkErrorIf(ctx, ctx, regex.test(ctx.output))
const filterNotLine = regex => ctx => resultOkErrorIf(ctx, ctx, !regex.test(ctx.output))
const filterLineComment = filterLine(lineCommentRegex)

const setContinuousLine = ctx => L.set(ctxL.lastContinuousLineNum, L.view(ctxL.lineNum, ctx), ctx)
const filterContinuousLines = ctx => {
    // const UNDEFINED_LINE_NUM = undefined
    const lastCLineNum = L.view(ctxL.lastContinuousLineNum, ctx)
    const currentLineNum = L.view(ctxL.lineNum, ctx)
    if (lastCLineNum) {
        if (lastCLineNum + 1 < currentLineNum) {
            return Result.Error(L.set(ctxL.lastContinuousLineNum, -1, ctx))
        }
    }
    return Result.Ok(setContinuousLine(ctx))
}

const filterBlockComment = (beginBlockRegex, endBlockRegex, blockModeLens) => ctx => {
    const inBlockMode = L.view(blockModeLens, ctx)
    const output = L.view(ctxL.output, ctx)
    if (inBlockMode && endBlockRegex.test(output)) {
        return Result.Error(L.set(blockModeLens, false, ctx))
    }
    if (beginBlockRegex.test(output)) {
        return Result.Error(L.set(blockModeLens, true, ctx))
    }
    return resultOkErrorIf(ctx, ctx, inBlockMode)
}

const filterTestBlock = ctx => {
    const resCtx = filterBlockComment(beginTestCommentMark, endTestCommentMark, ctxL.testBlockMode)(ctx).merge()
    // log2("----", resCtx)
    if (beginTestCommentMark.test(L.view(ctxL.output, resCtx))) {
        const ln = removeBeginTestBlockComment(L.view(ctxL.output, resCtx)).trim()
        if (ln) {
            console.log(ln)
        }
        const ctx2 = setContinuousLine(resCtx)
        return Result.Error(L.set(ctxL.testBlockMode, true, ctx2))
    }
    return resultOkErrorIf(resCtx, resCtx, L.view(ctxL.testBlockMode, resCtx))
}


// line transformers  
// str -> str

const removeLineComment = line => line.replace(/^(\s*\/\/)\s*(.*$)/, "$2")
const removeBeginTestBlockComment = line => line.replace(/^(\s*:::)\s*(.*$)/, "$2")


//-----------------------------------------------------------------------------------
// handlers
// ctx -> Result ctx

//filterTestLineHandler :: ctx -> Monad ctx
const filterTestLineHandler = compose.all(
    // log,
    chain(filterNotLine(lineCommentRegex)), //remove commented lines in test block
    chain(filterContinuousLines),
    chain(filterTestBlock),
    map(L.over(ctxL.output, removeLineComment)),
    filterLineComment,
)


const filterTestLineInBlockHandler = compose.all(
    chain(filterNotLine(lineCommentRegex)), //remove commented lines in test block
    // log,
    chain(filterContinuousLines),
    chain(filterTestBlock),
    // log,
    filterBlockComment(beginJSBlockCommentMark, endJSBlockCommentMark, ctxL.blockMode)
)



// mappers
// ctx -> ctx

const printCtxInputMapper = ctx => tap(compose(console.log, L.view(ctxL.input)), ctx)
const printCtxOutputMapper = ctx => tap(compose(console.log, L.view(ctxL.output)), ctx)

const addLineNumMapper = ctx => L.over(ctxL.output, s => `${L.view(ctxL.lineNum, ctx)}:\t${s}`, ctx)

//------------------------------------------------------------------------

//updateContextLine :: ctx -> str -> ctx
const setContextLine = line => ctx => compose.all(
    L.set(ctxL.output, line),
    L.set(ctxL.input, line),
    L.over(ctxL.lineNum, x => x + 1),
    // log2("contextLine"),
)(ctx)


//processLine :: (Result R) => (ctx -> R ctx) -> s -> R ctx -> R ctx
const processLine = (handler, line, context) => compose.all(
    r => r.merge(),  //ugly, folktale Result specific
    chain(handler),
    //log2("before Handler"),
    //tap(console.log),
    Result.of,
    setContextLine(line),
    // log2("start processLine"),
)(context)


//==================================================================================

module.exports = {
    //workhorse
    processLine,

    //logging
    log, log2,

    //context 
    createContext,

    //context lens
    ctxL,

    //ctx -> Result ctx
    handlers: {
        extractTestLine: ctx => filterTestLineHandler(ctx), //does better IDE code-auto-complete help
        extractTestLineInBlock: ctx => filterTestLineInBlockHandler(ctx),
    },

    //ctx -> Result ctx
    filters: {
        test: filterTestBlock,
        testBlock: filterTestLineInBlockHandler,
    },

    //ctx -> ctx
    mappers: {
        echoOutputLine: printCtxOutputMapper,
        echoInputLine: printCtxInputMapper,
        addLineNum: addLineNumMapper,
    },

}
