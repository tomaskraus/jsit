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
const ctxL = L.makeLenses(['input', 'output', 'lineNum', 'blockTestLineNum', 'blockCommentLineNum'])

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
const filterExcludeLine = regex => ctx => resultOkErrorIf(ctx, ctx, !regex.test(ctx.output))
const filterLineComment = filterLine(lineCommentRegex)

const BLOCK_LINE_OFF = -1


//setBlockLine :: (lens -> ctx) -> ctx
const setBlockLineNum = (blockLineNumLens, ctx) => L.set(blockLineNumLens, L.view(ctxL.lineNum, ctx), ctx)
const resetBlockLineNum = (blockLineNumLens, ctx) => L.set(blockLineNumLens, BLOCK_LINE_OFF, ctx)

const filterBlockComment = (beginBlockRegex, endBlockRegex, blockLineNumLens, beginBlockCallback) => ctx => {
    const blockLineNum = L.view(blockLineNumLens, ctx) || BLOCK_LINE_OFF
    const output = L.view(ctxL.output, ctx)
    //begin block
    if (beginBlockRegex.test(output)) {
        return Result.Ok(setBlockLineNum(blockLineNumLens, ctx))
            .chain(beginBlockCallback)
    }
    // block must be continuous
    if (L.view(ctxL.lineNum, ctx) > blockLineNum + 1) {
        return Result.Error(resetBlockLineNum(blockLineNumLens, ctx))
    }
    //end block
    if (endBlockRegex.test(output)) {
        return Result.Error(resetBlockLineNum(blockLineNumLens, ctx))
    }
    return Result.Ok(setBlockLineNum(blockLineNumLens, ctx))
}

const printBeginTestBlockOutputCallback = ctx => {
    const ln = removeBeginTestBlockComment(L.view(ctxL.output, ctx)).trim()
    if (ln) {
        console.log(ln)
    }
    return Result.Error(ctx)
}


// line transformers  
// str -> str

const removeLineComment = line => line.replace(/^(\s*\/\/)\s*(.*$)/, "$2")
const removeBeginTestBlockComment = line => line.replace(/^(\s*:::)\s*(.*$)/, "$2")


//-----------------------------------------------------------------------------------
// handlers
// ctx -> Result ctx

const filterTestLineInBlockHandler = compose.all(
    chain(filterExcludeLine(lineCommentRegex)), //remove commented lines in test block
    chain(filterBlockComment(beginTestCommentMark, endTestCommentMark, 
        ctxL.blockTestLineNum, printBeginTestBlockOutputCallback)),
    filterBlockComment(beginJSBlockCommentMark, endJSBlockCommentMark, 
        ctxL.blockCommentLineNum, Result.Ok)
)


// mappers
// ctx -> ctx

const printCtxInputMapper = ctx => tap(compose(console.log, L.view(ctxL.input)), ctx)
const printCtxOutputMapper = ctx => tap(compose(console.log, L.view(ctxL.output)), ctx)

const addLineNumMapper = ctx => L.over(ctxL.output, s => `${L.view(ctxL.lineNum, ctx)}:\t${s}`, ctx)

//------------------------------------------------------------------------

//setContextLine :: ctx -> str -> ctx
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
        // extractTestLine: ctx => filterTestLineHandler(ctx), //does better IDE code-auto-complete help
        extractTestLineInBlock: ctx => filterTestLineInBlockHandler(ctx),
    },

    //ctx -> ctx
    mappers: {
        echoOutputLine: printCtxOutputMapper,
        echoInputLine: printCtxInputMapper,
        addLineNum: addLineNumMapper,
    },

}
