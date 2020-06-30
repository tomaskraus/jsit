/**
 * Basics of block-of-lines processing, in a functional way
 * 
 * - You can create custom block "filters" by specifying block marks (beginning and end) via regex.
 * - You can chain these block filters
 *
 * 
 * There are bunch of objects:
 *   context, mappers, resultables, events, ctxReducer
 * 
 * Ctx is a "context" object, which stores a state.
 *   Has three main properties:
 *      - input: (string) the original line read
 *      - output: (string) line modified by some CtxActions, ...
 *      - lineNum: (number) a line number
 * 
 * CtxAction is a function that "changes" the state of the Ctx object (by creating a new Ctx object...)
 *   CtxAction :: Ctx -> Ctx
 * 
 * CtxResultable :: every function, that accepts a Ctx and returns a Result monad (Folktale's Result object), containing a new Ctx:
 *   CtxResultable :: Ctx -> Result Ctx Ctx
 * 
 *   CtxResultable can act as a filter (returning a "fail" Result type), but, unlike the filter, it can 
 *   also "change" the state (represented by Ctx object)
 * 
 *   it has two implementations there:
 *      - CtxResulter
 *      - CtxBlockResulter
 * 
 * CtxResulter is a CtxResultable function that accepts a Ctx and returns a Result monad (Folktale's Result object), containing a new Ctx:
 *   CtxResulter :: Ctx -> Result Ctx Ctx
 *  
 * CtxBlockResulter: same as CtxResulter, but with block awareness. Fires some block-related CtxEvents (see below).
 *   CtxResulter :: Ctx -> Result Ctx Ctx
 * 
 *   create the CtxBlockResulter by using the factory function:
 *      createCtxBlockResulter :: regex -> regex -> lens -> CtxEvents -> CtxBlockResulter
 *
 * CtxEvents: a bunch of CtxResulter objects.
 *   They are called by CtxBlockResulter object when a certain block state is reached. 
 *   Those events are:
 *      - onBlockBegin
 *      - onBlockEnd
 *      - onBlock
 * 
 *   CtxEvents :: { name: CtxResulter, ...}
 *   - These CtxResulters can be named as "CtxHandlers"
 *   - How to create CtxEvents object: by hand...
 * 
 * CtxReducer: a function that takes a state (Ctx) and a line (string), and returns the new state, using its internal CtxAction
 *   CtxReducer :: (Ctx, string) -> Ctx
 * 
 *   create the CtxReducer by using the factory function:
 *      createCtxReducer :: CtxAction -> CtxReducer
 * 
 * @module lineProc
 */


const { compose, curry } = require('folktale/core/lambda')
const { chain } = require('pointfree-fantasy')
const Result = require('folktale/result')
const L = require('lenses')

//--auxiliary pointfree------------------------------------------------------------------------------


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
    input: '',  //original input line
    output: '', //modified line
    lineNum: 0, //line number
})

// context lenses (to access ctx's fields)
const lens = L.makeLenses([
    'input',    //original input line
    'output',   //modified line
    'lineNum',
    'JSBlockCommentLineNum' //javascript comment block handling
])


//tapCtx :: (ctx {a, ...}) => lens a -> (a -> _) -> ctx -> ctx
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



//CtxEvents :: { name: CtxResulter, ...}

const createDefaultEventSettings = () => ({
    onBlockBegin: Result.Ok,
    onBlockEnd: Result.Error,
    onBlock: Result.Ok,     //fired when inside - not at the begin nor end of the block
})

const _mergeDefaultEventSettings = customEventSettings => ({ ...createDefaultEventSettings(), ...customEventSettings })

//TODO: REMOVE
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

// addEventHandlerBefore :: (events { key: (ctx -> Result ctx ctx), ...}) => (ctx -> Result ctx ctx) -> key -> events -> events
const addEventHandlerBefore = curry(3, (handler, eventName, events) => {
    const newEvents = { ...events }
    if (newEvents[eventName]) {
        newEvents[eventName] = compose(chain(newEvents[eventName]), handler)
    } else {
        newEvents[eventName] = handler
    }
    return newEvents
})

// filters -----------------------------------
// ... -> ctx -> Result ctx ctx

// createOutputLineFilter :: (context ctx, Result Res) => regex -> (ctx -> Res ctx ctx)
const createOutputLineFilter = regex => ctx => regex.test(L.view(lens.output, ctx)) 
    ? Result.Ok(ctx)
    : Result.Error(ctx)

//::: filterExcludeOutputLine
// const filterExcludeOutputLine = lineProc.filter.excludeOutputLine(/--/)
// filterExcludeOutputLine({ output: "- abc"}).merge().output === "- abc"
// filterExcludeOutputLine({ output: "-- abc"}) instanceof Result.Error
//
// filterExcludeOutputLine :: (context ctx, Result Res) => regex -> ctx -> Res ctx ctx
const filterExcludeOutputLine = regex => ctx => regex.test(L.view(lens.output, ctx)) ? Result.Error(ctx)
    : Result.Ok(ctx)


//createCtxBlockResulter :: regex -> regex -> lens -> CtxEvents -> CtxBlockResulter
const createCtxBlockResulter = (beginBlockRegex, endBlockRegex, blockLineNumLens, events) => {
    const BLOCK_LINE_OFF = -1
    const _setBlockLineNum = (blockLineNumLens, ctx) => L.set(blockLineNumLens, L.view(lens.lineNum, ctx), ctx)
    const _resetBlockLineNum = (blockLineNumLens, ctx) => L.set(blockLineNumLens, BLOCK_LINE_OFF, ctx)
    const fullEvents = _mergeDefaultEventSettings(events)
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

//createJSCommentCtxBlockResulter :: regex -> regex -> lens -> CtxEvents -> CtxBlockResulter
const createJSCommentCtxBlockResulter = events => createCtxBlockResulter(beginJSBlockCommentRegex, endJSBlockCommentRegex,
    lens.JSBlockCommentLineNum, events)

//::: filterJSLineComment
// const filterJSLineComment = lineProc.filter.JSLineComment
// assert.equal(filterJSLineComment({ output: "\/\/ abc"}).merge().output, "\/\/ abc")
// filterJSLineComment({ output: "\/ abc"}) instanceof Result.Error
//
const filterJSLineComment = createOutputLineFilter(JSLineCommentRegex)


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

//createCtxReducer :: CtxAction -> CtxReducer
const createCtxReducer = ctxAction => (ctx, line) => compose.all(
    ctxAction,
    setContextLine(line),
)(ctx)


//==================================================================================

module.exports = {
    factory: {
        //ctx
        createContext,
        //createCtxReducer :: CtxAction -> CtxReducer
        createCtxReducer: createCtxReducer,
        //ctx filters
        createJSCommentCtxBlockResulter: createJSCommentCtxBlockResulter,
        createCtxBlockResulter: createCtxBlockResulter,
    },

    //ctx lens
    lens,

    //events
    addEventHandlerBefore: addEventHandlerBefore,

    // (context ctx, Result Res) => regex -> ctx -> Res ctx ctx
    filter: {
        outputLine: createOutputLineFilter,
        excludeOutputLine: filterExcludeOutputLine,
        JSLineComment: filterJSLineComment,
    },

    //ctx -> ctx
    mapper: {
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


    //logging
    log, log2,

    //other

    //tapCtx :: (ctx {a, ...}) => lens -> (a -> _) -> ctx -> ctx
    tapCtx,
    //tap :: (a -> _) -> a -> a
    tap,
    //inc :: num -> num
    inc,
}
