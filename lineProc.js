/**
 * Basics of block-of-lines processing, in a functional way
 * 
 * You can:
 * - create custom block "filters" by specifying block marks (beginning and end) via regex.
 * - react to block-related events
 * - chain these block filters
 *
 * 
 * There are bunch of objects:
 *   context, actions, resultables, blockEvents, reducers
 * 
 * ctx is a "context" object, which stores a state.
 *   Has three main properties:
 *      - input: (string) the original line read
 *      - output: (string) line modified by some CtxActions, ...
 *      - lineNum: (number) a line number
 * 
 * CtxAction is a function that "changes" the state of the ctx object (by creating a new ctx object...)
 *   CtxAction :: ctx -> ctx
 * 
 * CtxResultable :: every function, that accepts a ctx and returns a Result monad (Folktale's Result object), containing a new ctx:
 *   CtxResultable :: ctx -> Result ctx ctx
 * 
 *   CtxResultable can act as a filter (returning a "fail" Result type), but, unlike the filter, it can 
 *   also "change" the state (represented by ctx object)
 * 
 *   it has three implementations there:
 *      - CtxFilter
 *      - CtxResulter
 *      - CtxBlockResulter
 * 
 * CtxFilter is a CtxResultable function that accepts a ctx and returns a Result monad (Folktale's Result object), containing the same, unmodified ctx:
 * It just returns Result.Ok or Result.Error, based on internal testing criteria. 
 *   CtxFilter :: CtxResultable
 * 
 *   Use createCtxFilter function to create a CtxFilter with a desired testing function in it:
 *     createCtxFilter :: (ctx -> boolean) -> CtxResultable   
 * 
 * 
 * CtxResulter is a CtxResultable function that accepts a ctx and returns a Result monad (Folktale's Result object), containing a new ctx:
 *   CtxResulter :: CtxResultable
 *  
 * CtxBlockResulter: same as CtxResulter, but with block awareness. Fires some block-related BlockEvents (see below).
 *   CtxBlockResulter :: CtxResultable
 * 
 *   create the CtxBlockResulter by using the factory function:
 *      createCtxBlockResulter :: regex -> regex -> lens -> BlockEvents -> CtxBlockResulter
 *
 * For convenience, there is a conversion function:
 *   ctxResultable2Action :: CtxResultable -> CtxAction
 * 
 * BlockEvents: a bunch of CtxResulter objects.
 *   They are called by CtxBlockResulter object when a certain block state is reached. 
 *   Those events are:
 *      - onBlockBegin
 *      - onBlockEnd
 *      - onBlock
 * 
 *   BlockEvents :: { block_event_name: CtxResulter, ...}
 *   - These CtxResulters can be named as "CtxHandlers"
 *   - How to create BlockEvents object: by hand...
 * 
 * CtxReducer: a function that takes a state (ctx) and a line (string), and returns the new state, using its internal CtxAction
 *   CtxReducer :: (ctx, string) -> ctx
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
const utils = require('./utils')

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
])


/**
    Runs a custom function fn with "some property p of context ctx" as an argument.
    Leaves that context unchanged.

    tapCtxLens :: (ctx {propName: propValue, ...}) => lens propName -> (propType -> _) -> ctx -> ctx

    //::: tapCtxLens   
    const newCtx = lineProc.tapCtxLens(lineProc.Lens.input, x => x + 1, {input: 1})
    assert.equal(newCtx.input, 1)   //should stay unchanged
*/

const tapCtxLens = curry(3, (lens, fn, ctx) => {
    fn(L.view(lens, ctx))
    return ctx
})


// regexes ----------------------------

const JSLineCommentRegex = /^\/\//
// TODO: add detection of one-line  block comment /*    */
const beginJSBlockCommentRegex = /^\/\*+\s*$/
const endJSBlockCommentRegex = /^.*\*\//
const blankLineRegex = /^\s*$/s



//BlockEvents :: { name: CtxResulter, ...}

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

// addEventHandlerBefore :: (events { key: CtxResultable, ...}) => CtxResultable -> key -> events -> events
const addEventHandlerBefore = curry(3, (handler, eventName, events) => {
    const newEvents = { ...events }
    if (newEvents[eventName]) {
        newEvents[eventName] = compose(chain(newEvents[eventName]), handler)
    } else {
        newEvents[eventName] = handler
    }
    return newEvents
})

// ctxFilters -----------------------------------
// (ctx -> boolean) -> CtxResultable

//createCtxFilter :: (ctx -> boolean) -> CtxResultable
const createCtxFilter = ctxTestFn => ctx => ctxTestFn(ctx) === true
    ? Result.Ok(ctx)
    : Result.Error(ctx)

//ctxFilterOutput :: (string -> boolean) -> CtxResultable
const ctxFilterOutput = strTestFn => createCtxFilter(ctx => strTestFn(L.view(lens.output, ctx)))

// ctxFilterOutputMatch :: (context ctx, Result Res) => regex -> CtxResultable
const ctxFilterOutputMatch = regex => ctxFilterOutput(s => regex.test(s))

//::: ctxFilterOutputNotMatch
// const ctxFilterOutputNotMatch = lineProc.CtxFilter.outputNotMatch(/--/)
// ctxFilterOutputNotMatch({ output: "- abc"}).merge().output === "- abc"
// ctxFilterOutputNotMatch({ output: "-- abc"}) instanceof Result.Error
//
// ctxFilterOutputNotMatch :: regex -> CtxResultable
const ctxFilterOutputNotMatch = regex => ctxFilterOutput(s => !regex.test(s))

//creates a new CtxBlockResulter. 
//The id parameter should differ among nested ctxBlockResulters.
//createCtxBlockResulter :: (string -> regex -> regex -> BlockEvents) -> CtxBlockResulter
const createCtxBlockResulter = (id, beginBlockRegex, endBlockRegex, events) => {
    //TODO: place blockLineNumLens under the new "id lens"
    const blockLineNumLens = L.makeLenses([id])[id] //just create one lens and use it
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
                .chain(fullEvents.onBlockEnd)
        }
        return Result.Ok(_setBlockLineNum(blockLineNumLens, ctx))
            .chain(fullEvents.onBlock)
    }
}

//jsCommentCtxBlockResulter :: regex -> regex -> lens -> BlockEvents -> CtxBlockResulter
const jsCommentCtxBlockResulter = events => createCtxBlockResulter('JSBlockComment',
    beginJSBlockCommentRegex, endJSBlockCommentRegex,
    events)


// CtxActions
// ctx -> ctx

//ctxOutputAction takes a string manipulation function and applies it to the output field if the ctx context object
//ctxOutputAction :: (str -> str) -> ctx -> ctx
const ctxMapOutputAction = curry(2, (fn, ctx) => L.over(lens.output, fn, ctx))

//trims the output line of the context
const trimCtxOutputAction = ctxMapOutputAction(s => s.trim())

/**
    ctxResultable2Action :: CtxResultable -> CtxAction 
  
    //::: ctxResultable2Action
    //    
    const ctxResultable2Action = lineProc.ctxResultable2Action
    const evenResulter = ctx => ctx.num % 2 === 0 ? Result.Ok(ctx) : Result.Error(ctx)
    const evenAction = ctxResultable2Action(evenResulter)    
    //
    evenResulter({num: 4}).merge().num === 4
    evenAction({num: 4}).num === 4
    //
    evenResulter({num: 3}) instanceof Result.Error
    evenAction({num: 3}).num === 3  
 */
const ctxResultable2Action = curry(2, 
    (resultable, ctx) => resultable(ctx).merge()
) 

//------------------------------------------------------------------------

//setCtxLine :: ctx -> str -> ctx
const setCtxLine = line => ctx => compose.all(
    trimCtxOutputAction,
    L.set(lens.output, line),
    L.set(lens.input, line),
    L.over(lens.lineNum, utils.inc),
    // log2("contextLine"),
)(ctx)

//createCtxReducer :: CtxAction -> CtxReducer
const createCtxReducer = ctxAction => (ctx, line) => compose.all(
    ctxAction,
    setCtxLine(line),
)(ctx)


//==================================================================================

module.exports = {
    Regex: {
        beginJSBlockComment: beginJSBlockCommentRegex,
        endJSBlockComment: endJSBlockCommentRegex,
        JSLineComment: JSLineCommentRegex,
        blankLine: blankLineRegex,
    },

    Factory: {
        //createContext :: () -> ctx
        createContext,

        //createCtxFilter :: (ctx -> boolean) -> CtxResultable
        createCtxFilter,

        //createCtxBlockResulter :: (string -> regex -> regex -> BlockEvents) -> CtxResultable
        createCtxBlockResulter,

        //createCtxReducer :: CtxAction -> CtxReducer
        createCtxReducer,
    },

    //ctx lens  //to help the IDE with auto-complete
    Lens: {
        input: lens.input,    //original input line
        output: lens.output,   //modified line
        lineNum: lens.lineNum,
    },

    //ctx

    //tapCtxLens :: (ctx {propName: propValue, ...}) => lens propName -> (propType -> _) -> ctx -> ctx
    tapCtxLens: tapCtxLens,

    //events
    //TODO: remove
    addEventHandlerBefore,

    // regex -> CtxResultable
    CtxFilter: {
        output: ctxFilterOutput,
        outputMatch: ctxFilterOutputMatch,
        outputNotMatch: ctxFilterOutputNotMatch,
    },

    //ctxAction :: ctx -> ctx
    CtxAction: {
        mapOutput: ctxMapOutputAction,
        trimOutput: trimCtxOutputAction,
    },

    //ctxResultable2Action :: CtxResultable -> CtxAction 
    ctxResultable2Action,

    //CtxResulters
    ctxBlockResulter: {
        jsCommentBlock: jsCommentCtxBlockResulter,
    },

}
