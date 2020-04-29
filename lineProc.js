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
//:::
// const lp = lineProc
// lp.inc(1) === 2
// assert.equal(lp.inc(-1), 0)
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

const JSLineCommentRegex = /^\/\//
// TODO: add detection of one-line  block comment /*    */
const beginJSBlockCommentRegex = /^\/\*+\s*$/
const endJSBlockCommentRegex = /^.*\*\//
const blankLineRegex = /^\s*$/s



// events
// { str: (ctx -> Result), ... }

const createDefaultEventSettings = () => ({
    onBlockBegin: Result.Ok,
    onBlockEnd: Result.Error,
    onBlock: Result.Ok,     //fired when inside - not the begin nor end of the block
})

const mergeDefaultEventSettings = customEventSettings => ({ ...createDefaultEventSettings(), ...customEventSettings })


//::: addEventHandlerBefore
// const add1 = x => Result.Ok(x + 1)
// const mult10 = x => Result.Ok(x * 10)
// const comps = compose(chain(add1), mult10) 
// const evts = { something: 1, onStart: add1 }
// //
// assert.deepEqual({...evts}, evts)
// assert.deepEqual(lineProc.addEventHandlerBefore(comps, 'onEnd', evts), {...evts, onEnd: comps})
// evts.onStart(10).merge() == 11
// ({...evts, onStart: comps}).onStart(10).merge() == 101
// lineProc.addEventHandlerBefore(mult10, 'onStart', evts).onStart(10).merge() == 101

// addEventHandlerBefore :: (events { str: (ctx -> Result ctx ctx) ...}) => (ctx -> Result ctx ctx) -> str -> events -> events
const addEventHandlerBefore = curry(3, (handler, eventName, events) => {
    const newEvents = {...events}
    if (newEvents[eventName]) {
        newEvents[eventName] = compose(chain(newEvents[eventName]), handler)
    } else {
        newEvents[eventName] = handler
    }
    return newEvents
})

// filters -----------------------------------
// ... -> ctx -> Result ctx ctx

// filterOutputLine :: (context ctx, Result Res) => regex -> ctx -> Res ctx ctx
const filterOutputLine = regex => ctx => regex.test(L.view(lens.output, ctx)) ? Result.Ok(ctx)
    : Result.Error(ctx)

//::: filterExcludeOutputLine
// const filterExcludeOutputLine = lineProc.filters.excludeOutputLine(/--/)
// filterExcludeOutputLine({ output: "- abc"}).merge().output === "- abc"
// filterExcludeOutputLine({ output: "-- abc"}) instanceof Result.Error
//
// filterExcludeOutputLine :: (context ctx, Result Res) => regex -> ctx -> Res ctx ctx
const filterExcludeOutputLine = regex => ctx => regex.test(L.view(lens.output, ctx)) ? Result.Error(ctx)
    : Result.Ok(ctx)

const BLOCK_LINE_OFF = -1

//isInBlock :: lens -> ctx -> bool
// gives proper result only if some customBlockFilter (from createCustomBlockFilter) is called before
const isInBlock = (blockLineNumLens, ctx) => L.view(lens.lineNum, ctx) === L.view(blockLineNumLens, ctx)

//createCustomBlockFilter :: regex -> regex -> lens -> {str: (ctx -> Result ctx ctx), ...} -> Result ctx ctx
const createCustomBlockFilter = (beginBlockRegex, endBlockRegex, blockLineNumLens, events) => {
    // log("CREATING customBlockFilter --- ---- ---- ---- ---- ------")
    //setBlockLine :: (lens -> ctx) -> ctx
    const _setBlockLineNum = (blockLineNumLens, ctx) => L.set(blockLineNumLens, L.view(lens.lineNum, ctx), ctx)
    const _resetBlockLineNum = (blockLineNumLens, ctx) => L.set(blockLineNumLens, BLOCK_LINE_OFF, ctx)
    const fullEvents = mergeDefaultEventSettings(events)
    // log(fullEvents)
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
                // .map(tap(() => console.log('- - - - - - - ')))
                .chain(fullEvents.onBlockEnd)
        }
        return Result.Ok(_setBlockLineNum(blockLineNumLens, ctx))
            .chain(fullEvents.onBlock)
    }
}


const createJSBlockCommentFilter = events => createCustomBlockFilter(beginJSBlockCommentRegex, endJSBlockCommentRegex,
    lens.JSBlockCommentLineNum, events)

//::: filterJSLineComment
// const filterJSLineComment = lineProc.filters.JSLineComment
// assert.equal(filterJSLineComment({ output: "\/\/ abc"}).merge().output, "\/\/ abc")
// filterJSLineComment({ output: "\/ abc"}) instanceof Result.Error
//
const filterJSLineComment = filterOutputLine(JSLineCommentRegex)


// line transformers  
// str -> str



// mappers
// ctx -> ctx

//lift2ctxOutputMapper :: (str -> str) -> ctx -> ctx
const liftCtxOutputMapper = curry(2, (fn, ctx) => L.over(lens.output, fn, ctx))

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
const createProcessLine = lineHandler => (context, line) => compose.all(
    r => r.merge(),  //ugly, folktale Result specific
    chain(lineHandler),
    //log2("before Handler"),
    Result.of,
    setContextLine(line),
)(context)


//==================================================================================

module.exports = {
    factory: {
        //ctx
        createContext: createContext,
        //workhorse
        createProcessLine,
        //events
        createDefaultEventSettings,

        createJSBlockCommentFilter,
        createCustomBlockFilter,
    },

    //events
    addEventHandlerBefore: addEventHandlerBefore,

    //logging
    log, log2,


    //context lens
    lens: {
        input: lens.input,
        output: lens.output,
        lineNum: lens.lineNum,
        JSBlockCommentLineNum: lens.JSBlockCommentLineNum,
    },
    //isInBlock :: lens -> ctx -> bool
    isInBlock,


    // ctx -> Result ctx ctx
    filters: {
        excludeOutputLine: filterExcludeOutputLine,
        JSLineComment: filterJSLineComment,
    },

    //ctx -> ctx
    mappers: {
        echoOutputLine: printCtxOutputMapper,
        echoInputLine: printCtxInputMapper,
        addLineNum: addLineNumMapper,
        liftCtxOutput: liftCtxOutputMapper,
        trimOutput: trimOutputMapper,
    },

    //regexes
    regex: {
        beginJSBlockComment: beginJSBlockCommentRegex,
        endJSBlockComment: endJSBlockCommentRegex,
        JSLineComment: JSLineCommentRegex,
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
