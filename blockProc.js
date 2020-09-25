/**
 * Basics of block-of-lines processing, in a functional way
 * 
 * You can:
 * - create custom block "filters" by specifying block marks (beginning and end) via regex.
 * - chain these block filters
 * - implement block-related callbacks
 *
 * 
 * TODO: resolve keyword clash: reducer vs. action
 * 
 * There are bunch of objects:
 *   context (a.k.a. ctx), reducers, resultables, blockCallbacks
 * 
 * ctx (context) is the object, that stores a line state.
 *   Has three main properties:
 *      - lineNum: (number) a line number (row counter)
 *      - line: (string) line modified by some CtxActions, ...
 *      - original: (string) the original line read
 * 
 *   ctx :: { lineNum: number, line: string, original: string }
 * 
 * 
 * CtxAction is a function that "changes" the state of the ctx object (by creating a new ctx object...)
 *   CtxAction :: ctx -> ctx
 * 
 * CtxResultable :: every function, that accepts a ctx and returns a Result monad (Folktale's Result object), 
 * containing a new ctx:
 *   Result :: https://folktale.origamitower.com/api/v2.3.0/en/folktale.result.html
 *   CtxResultable :: ctx -> Result ctx ctx
 * 
 *   CtxResultable can act as a filter, returning a "fail" Result type. It also can 
 *   "change" the state (represented by ctx object)
 * 
 *   it has three implementations there:
 *      - CtxResulter
 *      - CtxBlockResulter
 *      - CtxFilter
 * 
 *  CtxResulter, CtxBlockResulter, CtxFilter :: CtxResultable
 * 
 * 
 * CtxResulter is a CtxResultable function that accepts a ctx and returns a Result monad (Folktale's Result object), 
 * containing a new ctx:
 *   CtxResulter :: CtxResultable
 *  
 * CtxBlockResulter: same as CtxResulter, but with a block awareness. Stores its internal state to the context (ctx). 
 * Calls block-related BlockCallbacks (see below).
 *   CtxBlockResulter :: CtxResultable
 * 
 * BlockCallbacks are CtxResultable objects:
 *      - onBlockBegin
 *      - onBlock
 *      - onBlockEnd
 * 
 * There are two steps, to create the CtxBlockResulter:
 *      1. create a BlockProc object:
 *          createBlockProc :: (regex -> regex -> string) -> BlockProc
 *      2. call BlockProc.result method (provide BlockCallbacks) to create its CtxBlockResulter
 *          result :: (CtxResultable onBlockBegin, onBlock, onBlockEnd) => onBlockBegin -> onBlock -> onBlockEnd -> ctx -> Result ctx ctx
 * 
 *   
 * CtxFilter is a CtxResultable function that accepts a ctx and returns a Result monad (Folktale's Result object), 
 * containing the same, unmodified ctx:
 * It just returns Result.Ok or Result.Error, based on internal testing criteria. 
 *   CtxFilter :: CtxResultable
 * 
 *   Use createCtxFilter function to create a CtxFilter with a desired testing function in it:
 *     createCtxFilter :: (ctx -> boolean) -> CtxResultable   
 * 
 * 
 * For convenience, there is a ctxResultable2Action conversion function:
 *   ctxResultable2Action :: CtxResultable -> CtxAction
 * 
 * 
 * CtxReducer: a function that takes a state (ctx) and a line (string), and returns the new state, using its internal CtxAction
 *   CtxReducer :: (ctx, string) -> ctx
 * 
 *   create the CtxReducer by using the factory function:
 *      createCtxReducer :: CtxAction -> CtxReducer
 * 
 * @module blockProc
 */


const { compose, curry } = require('folktale/core/lambda')
const { chain } = require('pointfree-fantasy')
const Result = require('folktale/result')
const L = require('lenses')
const utils = require('./utils')

//createContext :: () -> ctx
const createContext = () => ({
    lineNum: 0,     //line number (row counter)
    line: '',       //line read
    original: '',   //original line read (for read only purpose)
})

// context lenses (to access ctx's fields)
const lens = L.makeLenses([
    'lineNum',  //line number (counter)
    'line',     //line read
    'original', //original line read (for read only purpose)
])


/**
    Runs a custom function fn with "some property p of context ctx" as an argument.
    Leaves that context unchanged.

    tapCtxLens :: ({propName: propValue, ...} ctx) => lens propName -> (propType -> _) -> ctx -> ctx

    //::: tapCtxLens   
    const newCtx = blockProc.tapCtxLens(blockProc.Lens.original, x => x + 1, {original: 1})
    assert.equal(newCtx.original, 1)   //should stay unchanged
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
// assert.deepEqual(blockProc.addEventHandlerBefore(comps, 'onEnd', evts), {...evts, onEnd: comps})
// evts.onStart(10).merge() == 11
// ({...evts, onStart: comps}).onStart(10).merge() == 101
// blockProc.addEventHandlerBefore(mult10, 'onStart', evts).onStart(10).merge() == 101

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

//ctxFilterLine :: (string -> boolean) -> CtxResultable
const ctxFilterLine = strTestFn => createCtxFilter(ctx => strTestFn(L.view(lens.line, ctx)))

// ctxFilterLineMatch :: regex -> CtxResultable
const ctxFilterLineMatch = regex => ctxFilterLine(s => regex.test(s))

//::: ctxFilterLineNotMatch
// const ctxFilterLineNotMatch = blockProc.CtxFilter.lineNotMatch(/--/)
// ctxFilterLineNotMatch({ line: "- abc"}).merge().line === "- abc"
// ctxFilterLineNotMatch({ line: "-- abc"}) instanceof Result.Error
//
// ctxFilterLineNotMatch :: regex -> CtxResultable
const ctxFilterLineNotMatch = regex => ctxFilterLine(s => !regex.test(s))

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
        const line = L.view(lens.line, ctx)
        //begin block
        if (beginBlockRegex.test(line)) {
            return Result.Ok(_setBlockLineNum(blockLineNumLens, ctx))
                .chain(fullEvents.onBlockBegin)
        }
        // block must be continuous
        if (L.view(lens.lineNum, ctx) > blockLineNum + 1) {
            return Result.Error(_resetBlockLineNum(blockLineNumLens, ctx))
        }
        //end block
        if (endBlockRegex.test(line)) {
            return Result.Ok(_resetBlockLineNum(blockLineNumLens, ctx))
                .chain(fullEvents.onBlockEnd)
        }
        return Result.Ok(_setBlockLineNum(blockLineNumLens, ctx))
            .chain(fullEvents.onBlock)
    }
}


//creates a BlockProc object. You can call its "result" method to get a "stateful & block aware" CtxBlockResulter
//The id parameter should differ among nested ctxBlockProcs.
//createBlockProc :: (regex -> regex -> string) -> BlockProc
//result :: (CtxResultable onBlockBegin, onBlock, onBlockEnd) => onBlockBegin -> onBlock -> onBlockEnd -> ctx -> Result ctx ctx
const createBlockProc = (beginBlockRegex, endBlockRegex, id) => {
    //TODO: place blockLineNumLens under the new "id lens"
    const blockLineNumLens = L.makeLenses([id])[id] //just create one lens and use it
    const BLOCK_LINE_OFF = -1
    const _setBlockLineNum = (blockLineNumLens, ctx) => L.set(blockLineNumLens, L.view(lens.lineNum, ctx), ctx)
    const _resetBlockLineNum = (blockLineNumLens, ctx) => L.set(blockLineNumLens, BLOCK_LINE_OFF, ctx)
    const defaultCallback = ctx => Result.Ok(ctx)

    return {
        result: (onBlockBegin, onBlock, onBlockEnd) => {
            onBlockBegin = onBlockBegin || defaultCallback
            onBlock= onBlock || defaultCallback
            onBlockEnd = onBlockEnd || defaultCallback
            return ctx => {
                const blockLineNum = L.view(blockLineNumLens, ctx) || BLOCK_LINE_OFF
                const line = L.view(lens.line, ctx)
                //begin block
                if (beginBlockRegex.test(line)) {
                    // console.log(ctx)
                    return Result.Ok(_setBlockLineNum(blockLineNumLens, ctx))
                        .chain(onBlockBegin)
                }
                // block must be continuous
                if (L.view(lens.lineNum, ctx) > blockLineNum + 1) {
                    return Result.Error(_resetBlockLineNum(blockLineNumLens, ctx))
                }
                //end block
                if (endBlockRegex.test(line)) {
                    return Result.Ok(_resetBlockLineNum(blockLineNumLens, ctx))
                        .chain(onBlockEnd)
                }
                return Result.Ok(_setBlockLineNum(blockLineNumLens, ctx))
                    .chain(onBlock)
            }
        }
    }
}



//jsCommentCtxBlockResulter :: BlockEvents -> CtxBlockResulter
const jsCommentCtxBlockResulter = events => createCtxBlockResulter('JSBlockComment',
    beginJSBlockCommentRegex, endJSBlockCommentRegex,
    events)


// CtxActions
// ctx -> ctx

//ctxMapLineAction takes a string manipulation function and applies it to the 'line' field if the ctx context object
//ctxMapLineAction :: (str -> str) -> CtxAction
const ctxMapLineAction = curry(2, (fn, ctx) => L.over(lens.line, fn, ctx))

//trims the line line of the context
//trimCtxLineAction :: CtxAction
const trimCtxLineAction = ctxMapLineAction(s => s.trim())

/**
    ctxResultable2Action :: CtxResultable -> CtxAction 
  
    //::: ctxResultable2Action
    //    
    const ctxResultable2Action = blockProc.ctxResultable2Action
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
    trimCtxLineAction,
    L.set(lens.line, line),
    L.set(lens.original, line),
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

    /** signatures:     
      ctx :: { original: string, line: string, lineNum: number }
      CtxAction :: ctx -> ctx
      
      Result :: https://folktale.origamitower.com/api/v2.3.0/en/folktale.result.html
      CtxResultable :: ctx -> Result ctx ctx
      CtxFilter, CtxResulter, CtxBlockResulter :: CtxResultable
      
      BlockEvents :: { onBlockBegin: CtxResultable, onBlockEnd: CtxResultable, onBlock: CtxResultable }
      
      CtxReducer :: (ctx, string) -> ctx
    */


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

        //createBlockProc :: (regex -> regex -> string) -> BlockProc
        createBlockProc,

        //createCtxReducer :: CtxAction -> CtxReducer
        createCtxReducer,


    },

    //...helps the IDE with auto-complete
    Lens: {
        original: lens.original,      //original original line
        line: lens.line,    //modified line
        lineNum: lens.lineNum,  //line number
    },

    //tapCtxLens :: (ctx {propName: propValue, ...}) => lens propName -> (propType -> _) -> ctx -> ctx
    tapCtxLens: tapCtxLens,

    //events
    //TODO: remove
    addEventHandlerBefore,

    CtxFilter: {
        //ctxFilterLine :: (string -> boolean) -> CtxResultable
        line: ctxFilterLine,

        //ctxFilterLineMatch :: regex -> CtxResultable
        lineMatch: ctxFilterLineMatch,

        //ctxFilterLineNotMatch :: regex -> CtxResultable
        lineNotMatch: ctxFilterLineNotMatch,
    },

    CtxAction: {
        /**
         * maps a function to ctx's line
         * //ctxMapLineAction :: (str -> str) -> CtxAction
         */
        mapLine: ctxMapLineAction,

        //trimCtxLineAction :: CtxAction
        trimLine: trimCtxLineAction,
    },

    //ctxResultable2Action :: CtxResultable -> CtxAction 
    ctxResultable2Action,

    ctxBlockResulter: {
        //jsCommentCtxBlockResulter :: BlockEvents -> CtxBlockResulter
        jsCommentBlock: jsCommentCtxBlockResulter,
    },

}
