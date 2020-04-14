/**
 * Everything about single line extracting
 * can handle block comments
 * 
 * @module lineProc
 */


const { compose, curry } = require('folktale/core/lambda')
const { map, chain } = require('pointfree-fantasy')
const Result = require('folktale/result')
const L = require('lenses')

//--auxiliary pointfree------------------------------------------------------------------------------


//ifElse :: (Bifunctor B) => ((a -> bool) -> B a a -> B a a) -> a -> B a a
const ifElse = curry(4, ((fn, ifTrue, ifFalse, val) => fn(val) ? ifTrue(val)
    : ifFalse(val))
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
const lens = L.makeLenses(['input', 'output', 'lineNum', 'blockCommentLineNum'])

//--------------------------------------------------------------------------------

// const impure = {}

// impure.prettyPrint = ctx => {
//     console.log(`${L.view(ctxL.lineNum, ctx)}: ${L.view(ctxL.output, ctx)}`)
//     return ctx
// }


// regexes ----------------------------

const lineComment = /^\s*\/\//s
// TODO: add detection of one-line  block comment /*    */
const beginJSBlockCommentMark = /^\s*\/\*/s
const endJSBlockCommentMark = /^\s*\*\//s


// filters -----------------------------------
// ... -> ctx -> Result ctx


// filterExcludeOutputLine :: (context ctx, Result Res) => regex -> ctx -> Res ctx ctx
const filterExcludeOutputLine = regex => ctx => regex.test(L.view(lens.output, ctx)) ? Result.Error(ctx)
    : Result.Ok(ctx)

const BLOCK_LINE_OFF = -1
//setBlockLine :: (lens -> ctx) -> ctx
const setBlockLineNum = (blockLineNumLens, ctx) => L.set(blockLineNumLens, L.view(lens.lineNum, ctx), ctx)
const resetBlockLineNum = (blockLineNumLens, ctx) => L.set(blockLineNumLens, BLOCK_LINE_OFF, ctx)

const filterBlockComment = (beginBlockRegex, endBlockRegex, blockLineNumLens, beginBlockHandler) => ctx => {
    const blockLineNum = L.view(blockLineNumLens, ctx) || BLOCK_LINE_OFF
    const output = L.view(lens.output, ctx)
    //begin block
    if (beginBlockRegex.test(output)) {
        return Result.Ok(setBlockLineNum(blockLineNumLens, ctx))
            .chain(beginBlockHandler)
    }
    // block must be continuous
    if (L.view(lens.lineNum, ctx) > blockLineNum + 1) {
        return Result.Error(resetBlockLineNum(blockLineNumLens, ctx))
    }
    //end block
    if (endBlockRegex.test(output)) {
        return Result.Error(resetBlockLineNum(blockLineNumLens, ctx))
    }
    return Result.Ok(setBlockLineNum(blockLineNumLens, ctx))
}


// line transformers  
// str -> str

const removeLineComment = line => line.replace(/^(\s*\/\/)\s*(.*$)/, "$2")


//-----------------------------------------------------------------------------------
// handlers
// ctx -> Result ctx

const filterBlockHandler = filterBlockComment(beginJSBlockCommentMark, endJSBlockCommentMark,
    lens.blockCommentLineNum, Result.Ok)

// mappers
// ctx -> ctx

const printCtxInputMapper = ctx => tap(compose(console.log, L.view(lens.input)), ctx)
const printCtxOutputMapper = ctx => tap(compose(console.log, L.view(lens.output)), ctx)

const addLineNumMapper = ctx => L.over(lens.output, s => `${L.view(lens.lineNum, ctx)}:\t${s}`, ctx)

//------------------------------------------------------------------------

//setContextLine :: ctx -> str -> ctx
const setContextLine = line => ctx => compose.all(
    L.set(lens.output, line),
    L.set(lens.input, line),
    L.over(lens.lineNum, x => x + 1),
    // log2("contextLine"),
)(ctx)


//processLine :: (Result R, context c) => ((c -> R c c) -> string -> R c c) -> R c c
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
    lens,

    filters: {
        filterExcludeOutputLine,
        filterBlockComment,
    },

    handlers: {
        filterBlockHandler,
    },

    //ctx -> ctx
    mappers: {
        echoOutputLine: printCtxOutputMapper,
        echoInputLine: printCtxInputMapper,
        addLineNum: addLineNumMapper,
    },

    //regexes
    regex: {
        beginJSBlockCommentMark,
        endJSBlockCommentMark,
        lineComment,
    }
}
