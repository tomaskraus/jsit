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
const ctxL = L.makeLenses(['input', 'output', 'lineNum', 'blockMode', 'lastContinuousLineNum'])

//--------------------------------------------------------------------------------

const impure = {}


impure.prettyPrint = ctx => {
    console.log(`${ctx.lineNum}: ${ctx.output}`)
    return ctx
}


// regexes ----------------------------

const lineCommentRegex = /^\s*\/\//
const lineNotCommentRegex = /^\s*[^\/][^\/]/
// TODO: add detection of one-line  block comment /*    */
const beginJSCommentMark = /a/
const endJSCommentMark = /b/

const beginTestCommentMark = /^\s*:::.*/
const endTestCommentMark = /^\s*$/


// filters -----------------------------------
// ... -> ctx -> Result ctx


// filterLine :: (context ctx, Result Res) => regex -> ctx -> Res ctx ctx
const filterLine = regex => ctx => resultOkErrorIf(ctx, ctx, regex.test(ctx.output))
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

const filterBlockComment = (beginBlockRegex, endBlockRegex) => ctx => {
    const inBlockMode = (L.view(ctxL.blockMode, ctx))
    if (inBlockMode && endBlockRegex.test(ctx.output)) {
        return Result.Error(L.set(ctxL.blockMode, false, ctx))
    }
    if (beginBlockRegex.test(ctx.output)) {
        const ctxUpd = setContinuousLine(ctx)
        return Result.Error(L.set(ctxL.blockMode, true, ctxUpd))
    }
    return resultOkErrorIf(ctx, ctx, inBlockMode)
}

const filterTestBlock = filterBlockComment(beginTestCommentMark, endTestCommentMark)


// line transformers  
// str -> str

const removeLineComment = line => line.replace(/^(\s*\/\/)\s*(.*$)/, "$2")


//-----------------------------------------------------------------------------------
// handlers
// ctx -> Result ctx

//filterTestLineHandler :: ctx -> Monad ctx
const filterTestLineHandler = compose.all(
    // log,
    chain(filterLine(lineNotCommentRegex)), //remove commented lines in test block
    chain(filterContinuousLines),
    chain(filterTestBlock),
    map(L.over(ctxL.output, removeLineComment)),
    filterLineComment,
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
    },

    //ctx -> Result ctx
    filters: {
        test: filterTestBlock,
    },

    //ctx -> ctx
    mappers: {
        echoOutputLine: printCtxOutputMapper,
        echoInputLine: printCtxInputMapper,
        addLineNum: addLineNumMapper,
    },

}
