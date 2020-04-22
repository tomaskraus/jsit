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

//inc :: num -> num
const inc = i => i + 1

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


//tapCtx :: (ctx {a, ...}) => lens -> (a -> _) -> ctx -> ctx
const tapCtx = curry(3, (lens, fn, ctx) => {
    fn(L.view(lens, ctx))
    return ctx
})


// regexes ----------------------------

const lineCommentRegex = /^\/\//
// TODO: add detection of one-line  block comment /*    */
const beginJSBlockCommentRegex = /^\/\*/
const endJSBlockCommentRegex = /^\*\//
const blankLineRegex = /^\s*$/s


// event handlers
// ctx -> Result

defaultBlockBeginHandler = Result.Ok

//defaultBlockHandler = Result.Ok

defaultBlockEndHandler = ctx => {
    // log2('ev-  endBlock----', ctx)
    return Result.Error(ctx)
}


// events
// { eventKey: eventHandler ... }

const createDefaultEventSettings = () => ({
    onBlockBegin: defaultBlockBeginHandler,
    onBlockEnd: defaultBlockEndHandler,
    //onBlock: defaultBlockHandler,     //fired when inside - not the begin nor end of the block
})

const mergeEventSettings = customEventSettings => ({ ...createDefaultEventSettings(), ...customEventSettings })

// filters -----------------------------------
// ... -> ctx -> Result ctx

// filterOutputLine :: (context ctx, Result Res) => regex -> ctx -> Res ctx ctx
const filterOutputLine = regex => ctx => regex.test(L.view(lens.output, ctx)) ? Result.Ok(ctx)
    : Result.Error(ctx)
// filterExcludeOutputLine :: (context ctx, Result Res) => regex -> ctx -> Res ctx ctx
const filterExcludeOutputLine = regex => ctx => regex.test(L.view(lens.output, ctx)) ? Result.Error(ctx)
    : Result.Ok(ctx)

const BLOCK_LINE_OFF = -1

//isInBlock :: lens -> ctx -> bool
// gives proper result only if some customBlockFilter (from createCustomBlockFilter) is called before
const isInBlock = (blockLineNumLens, ctx) => L.view(lens.lineNum, ctx) === L.view(blockLineNumLens, ctx)

//createCustomBlockFilter :: regex -> regex -> lens -> {eventKey: (ctx -> Result ctx ctx) ...} -> Result ctx ctx
const createCustomBlockFilter = (beginBlockRegex, endBlockRegex, blockLineNumLens, events) => {
    // log("CREATING customBlockFilter --- ---- ---- ---- ---- ------")
    //setBlockLine :: (lens -> ctx) -> ctx
    const _setBlockLineNum = (blockLineNumLens, ctx) => L.set(blockLineNumLens, L.view(lens.lineNum, ctx), ctx)
    const _resetBlockLineNum = (blockLineNumLens, ctx) => L.set(blockLineNumLens, BLOCK_LINE_OFF, ctx)
    const fullEvents = mergeEventSettings(events)
    return ctx => {
        const blockLineNum = L.view(blockLineNumLens, ctx) || BLOCK_LINE_OFF
        const output = L.view(lens.output, ctx)
        //begin block
        if (beginBlockRegex.test(output)) {
            return Result.Ok(_setBlockLineNum(blockLineNumLens, ctx))
                .chain(fullEvents.onBlockBegin)
        }
        // block must be continuous
        if (L.view(lens.lineNum, ctx) > blockLineNum + 1) {
            return Result.Error(_resetBlockLineNum(blockLineNumLens, ctx))
        }
        //end block
        if (endBlockRegex.test(output)) {
            return Result.Ok(_resetBlockLineNum(blockLineNumLens, ctx))
                .chain(fullEvents.onBlockEnd)
        }
        return Result.Ok(_setBlockLineNum(blockLineNumLens, ctx))
        //.chain(events.onBlock)
    }
}


const filterJSBlockComment = createCustomBlockFilter(beginJSBlockCommentRegex, endJSBlockCommentRegex,
    lens.JSBlockCommentLineNum, createDefaultEventSettings())

const filterJSLineComment = filterOutputLine(lineCommentRegex)


// line transformers  
// str -> str

const removeLineComment = line => line.replace(/^(\s*\/\/)\s*(.*$)/, "$2")


// mappers
// ctx -> ctx

//lift2ctxOutputMapper :: (str -> str) -> ctx -> ctx
const liftCtxOutputMapper = fn => ctx => L.over(lens.output, fn, ctx)

const removeLineCommentMapper = liftCtxOutputMapper(removeLineComment)
const trimOutputMapper = liftCtxOutputMapper(s => s.trim())
const printCtxInputMapper = ctx => tap(compose(console.log, L.view(lens.input)), ctx)
const printCtxOutputMapper = ctx => tap(compose(console.log, L.view(lens.output)), ctx)

const addLineNumMapper = ctx => L.over(lens.output,
    s => `${L.view(lens.lineNum, ctx)}:\t${s}`,
    ctx)

//------------------------------------------------------------------------

//setContextLine :: ctx -> str -> ctx
const setContextLine = line => ctx => compose.all(
    trimOutputMapper,
    L.set(lens.output, line),
    L.set(lens.input, line),
    L.over(lens.lineNum, inc),
    // log2("contextLine"),
)(ctx)


//createProcessLine :: (Result R, context c) => (c -> R c c) -> (string -> c) -> R c c
const createProcessLine = lineHandler => (line, context) => compose.all(
    r => r.merge(),  //ugly, folktale Result specific
    chain(lineHandler),
    //log2("before Handler"),
    Result.of,
    setContextLine(line),
)(context)


//==================================================================================

module.exports = {
    //workhorse
    createProcessLine,

    //logging
    log, log2,

    //ctx
    createContext,
    
    //context lens
    lens: {
        input: lens.input,
        output: lens.output,
        lineNum: lens.lineNum,
        JSBlockCommentLineNum: lens.JSBlockCommentLineNum,
    },
    //isInBlock :: lens -> ctx -> bool
    isInBlock,
    
    //events
    createDefaultEventSettings,

    // ctx -> Result ctx ctx
    filters: {
        excludeOutputLine: filterExcludeOutputLine,
        createCustomBlockFilter: createCustomBlockFilter,
        lineComment: filterJSLineComment,
        JSBlockComment: filterJSBlockComment,
    },

    //ctx -> ctx
    mappers: {
        echoOutputLine: printCtxOutputMapper,
        echoInputLine: printCtxInputMapper,
        addLineNum: addLineNumMapper,
        removeLineComment: removeLineCommentMapper,
        liftCtxOutput: liftCtxOutputMapper,
        trimOutput: trimOutputMapper,
    },

    //regexes
    regex: {
        beginJSBlockComment: beginJSBlockCommentRegex,
        endJSBlockComment: endJSBlockCommentRegex,
        lineComment: lineCommentRegex,
        blankLine: blankLineRegex,
    },


    //other

    //tapCtx :: (ctx {a, ...}) => lens -> (a -> _) -> ctx -> ctx
    tapCtx,
    //tap :: (a -> _) -> a -> a
    tap,
    //inc :: num -> num
    inc,
}
