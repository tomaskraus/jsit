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
const ifElse = curry(4, ((fn, constructorTrue, constructorFalse, val) => fn(val) ? constructorTrue(val)
    : constructorFalse(val))
)

//tap :: (a -> _) -> a -> a
const tap = curry(2, (fn, a) => {
    fn(a)
    return a
})

//log2 :: str -> a -> a
const log2 = curry(2, (descr, a) => tap(s => console.log(`LOG ${descr}:`, s), a)
)

//log :: a -> a
const log = log2("")

//--------------------------------------------------------------------------------

//createContext :: () -> ctx
const createContext = () => ({
    input: '',
    output: '',
    lineNum: 0,
})

// context lenses
const lens = L.makeLenses(['input', 'output', 'lineNum', 'JSBlockCommentLineNum'])

// regexes ----------------------------

const lineCommentRegex = /^\s*\/\//s
// TODO: add detection of one-line  block comment /*    */
const beginJSBlockCommentRegex = /^\s*\/\*/s
const endJSBlockCommentRegex = /^\s*\*\//s


// filters -----------------------------------
// ... -> ctx -> Result ctx

// filterOutputLine :: (context ctx, Result Res) => regex -> ctx -> Res ctx ctx
const filterOutputLine = regex => ctx => regex.test(L.view(lens.output, ctx)) ? Result.Ok(ctx)
    : Result.Error(ctx)
// filterExcludeOutputLine :: (context ctx, Result Res) => regex -> ctx -> Res ctx ctx
const filterExcludeOutputLine = regex => ctx => regex.test(L.view(lens.output, ctx)) ? Result.Error(ctx)
    : Result.Ok(ctx)

const BLOCK_LINE_OFF = -1
//setBlockLine :: (lens -> ctx) -> ctx
const _setBlockLineNum = (blockLineNumLens, ctx) => L.set(blockLineNumLens, L.view(lens.lineNum, ctx), ctx)
const _resetBlockLineNum = (blockLineNumLens, ctx) => L.set(blockLineNumLens, BLOCK_LINE_OFF, ctx)

//isInBlock :: lens -> ctx -> bool
// gives proper result only if filterCustomBlockComment is called before
const isInBlock = (blockLineNumLens, ctx) => L.view(lens.lineNum, ctx) === L.view(blockLineNumLens, ctx)

//filterCustomBlockComment :: regex -> regex -> lens -> (ctx -> Result ctx ctx) -> Result ctx ctx
const filterCustomBlockComment = (beginBlockRegex, endBlockRegex, blockLineNumLens, beginBlockHandler) => ctx => {
    const blockLineNum = L.view(blockLineNumLens, ctx) || BLOCK_LINE_OFF
    const output = L.view(lens.output, ctx)
    //begin block
    if (beginBlockRegex.test(output)) {
        return Result.Ok(_setBlockLineNum(blockLineNumLens, ctx))
            .chain(beginBlockHandler)
    }
    // block must be continuous
    if (L.view(lens.lineNum, ctx) > blockLineNum + 1) {
        return Result.Error(_resetBlockLineNum(blockLineNumLens, ctx))
    }
    //end block
    if (endBlockRegex.test(output)) {
        return Result.Error(_resetBlockLineNum(blockLineNumLens, ctx))
    }
    return Result.Ok(_setBlockLineNum(blockLineNumLens, ctx))
}


const filterJSBlockComment = filterCustomBlockComment(beginJSBlockCommentRegex, endJSBlockCommentRegex,
    lens.JSBlockCommentLineNum, Result.Ok)

const filterJSLineComment = filterOutputLine(lineCommentRegex)


// line transformers  
// str -> str

const removeLineComment = line => line.replace(/^(\s*\/\/)\s*(.*$)/, "$2")


// mappers
// ctx -> ctx

const removeLineCommentMapper = ctx => L.over(lens.output, removeLineComment, ctx)
const printCtxInputMapper = ctx => tap(compose(console.log, L.view(lens.input)), ctx)
const printCtxOutputMapper = ctx => tap(compose(console.log, L.view(lens.output)), ctx)

const addLineNumMapper = ctx => L.over(lens.output,
    s => `${L.view(lens.lineNum, ctx)}:\t${s}`,
    ctx)

//------------------------------------------------------------------------

//setContextLine :: ctx -> str -> ctx
const setContextLine = line => ctx => compose.all(
    L.set(lens.output, line),
    L.set(lens.input, line),
    L.over(lens.lineNum, x => x + 1),
    // log2("contextLine"),
)(ctx)


//processLine :: (Result R, context c) => ((c -> R c c) -> string -> c) -> R c c
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

    //ctx
    createContext,

    //context lens
    lens,

    // ctx -> Result ctx ctx
    filters: {
        excludeOutputLine: filterExcludeOutputLine,
        customBlockComment: filterCustomBlockComment,
        lineComment: filterJSLineComment,
        JSBlockComment: filterJSBlockComment,
    },

    //ctx -> ctx
    mappers: {
        echoOutputLine: printCtxOutputMapper,
        echoInputLine: printCtxInputMapper,
        addLineNum: addLineNumMapper,
        removeLineComment: removeLineCommentMapper,
    },

    //regexes
    regex: {
        beginJSBlockComment: beginJSBlockCommentRegex,
        endJSBlockComment: endJSBlockCommentRegex,
        lineComment: lineCommentRegex,
    },

    //other
    //isInBlock :: lens -> ctx -> bool
    isInBlock,
}
