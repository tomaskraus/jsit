/**
 * Basics of "block of lines" processing, for textual data - in a functional way.
 * 
 * You can:
 * - create line filters and modifiers
 * - create block "filters" by specifying block marks (beginning and end) via regex.
 * - compose these line modifiers and filters (both block and line) together
 * - implement block-related callbacks
 *
 * 
 * There are bunch of objects:
 *   context (a.k.a. ctx), reducers, resultables, blockCallbacks
 * 
 * ctx (context) is the object, that stores the state of a textual data processed.
 *   It has three main properties:
 *      - lineNum: (number) a line number (row counter)
 *      - line: (string) line read, possibly "modified" by some functions later
 *      - original: (string) the original line read
 * 
 *   ctx :: { lineNum: number, line: string, original: string }
 * 
 * 
 * 
 * CtxReducer: a function that takes a state (ctx) and a line (string), and returns the new state, using its internal CtxAction
 *   CtxReducer :: (ctx, string) -> ctx
 * 
 *   create the CtxReducer by using the factory function:
 *      reducer :: CtxAction -> CtxReducer
 * 
 * 
 * 
 * CtxResultable :: every function, that accepts a ctx and returns a Result monad (Folktale's Result object), 
 * containing a new ctx:
 *   Result :: https://folktale.origamitower.com/api/v2.3.0/en/folktale.result.html
 *   CtxResultable :: ctx -> Result ctx ctx
 * 
 *   CtxResultable can act as a filter. It also can 
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
 *      - onBlockEnd
 * 
 * There are two steps, to create the CtxBlockResulter:
 *      1. create a BlockObj object:
 *          createBlockObj :: (regex -> regex -> string) -> BlockObj
 *      2. call BlockObj.resulter method (provide BlockCallbacks) to create its CtxBlockResulter
 *          BlockObj.resulter :: (CtxResultable onBlockBegin, onBlockEnd) => (onBlockBegin -> onBlockEnd) -> ctx -> Result ctx ctx
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
 * 
 * @module text_block_filter
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
    Returns that context unchanged.

    tapCtxLens :: ({propName: propValue, ...} ctx) => lens propName -> (propType -> _) -> ctx -> ctx

    //::: tapCtxLens   
    const newCtx = text_block_filter.tapCtxLens(text_block_filter.Lens.original, x => x + 1, {original: 1})
    assert.equal(newCtx.original, 1)   //should stay unchanged
*/
const tapCtxLens = curry(3, (lens, fn, ctx) => {
    fn(L.view(lens, ctx))
    return ctx
})

/**
    Runs a custom string manipulation function fn with a "line property of a context ctx" as an argument.
    Returns that context unchanged.

    tapCtxLens :: ({line: string, ...} ctx) => (string -> _) -> ctx -> ctx

    //::: tapCtxLens   
    const newCtx = text_block_filter.tapCtxLens(text_block_filter.Lens.line, s => s + 's', {line: "work"})
    assert.equal(newCtx.line, 'work')   //should stay unchanged
*/
const tapCtxLineLens = fn => ctx => {
    fn(L.view(lens.line, ctx))
    return ctx
}

/**
    Runs a custom string manipulation function fn with a "line property of a context ctx" as an argument. 
    Returns a new context, with its "line" property set to the result of that function fn.

    overCtxLineLens :: ({line: string, ...} ctx) => (string -> _) -> ctx -> ctx

    //::: overCtxLineLens   
    const newCtx = text_block_filter.overCtxLens(text_block_filter.Lens.line, s => s + 's', {line: "work"})
    assert.equal(newCtx.line, 'works')   //should be changed
*/
const overCtxLineLens = fn => ctx => L.over(lens.line, fn, ctx)

// regexes ----------------------------

const blankLineRegex = /^\s*$/s
const JSLineCommentRegex = /^\/\//
// TODO: add detection of one-line  block comment /*    */
const beginJSBlockCommentRegex = /^\/\*+\s*$/
const endJSBlockCommentRegex = /^.*\*\//


// ctxFilter creators -----------------------------------
// (any -> boolean) -> CtxResultable

//createCtxFilter :: (ctx -> boolean) -> CtxResultable
const createCtxFilter = ctxTestFn => ctx => ctxTestFn(ctx) === true
    ? Result.Ok(ctx)
    : Result.Error(ctx)

//ctxFilterLine :: (string -> boolean) -> CtxResultable
const ctxFilterLine = strTestFn => createCtxFilter(ctx => strTestFn(L.view(lens.line, ctx)))


//creates a BlockObj object. You can call its "result" method to get a "stateful & block aware" CtxBlockResulter
//The id parameter should differ among nested ctxBlockObjs.
//createBlockObj :: (regex -> regex -> string) -> BlockObj
//BlockObj.filterBlock :: (CtxResultable onBlockBegin, onBlockEnd) => (onBlockBegin -> onBlockEnd) -> ctx -> Result ctx ctx
const createBlockObj = (beginBlockRegex, endBlockRegex, id) => {
    //TODO: place blockLineNumLens under the new "id lens"
    const blockLineNumLens = L.makeLenses([id])[id] //just create one lens and use it
    const BLOCK_LINE_OFF = -1
    const _setBlockLineNum = (blockLineNumLens, ctx) => L.set(blockLineNumLens, L.view(lens.lineNum, ctx), ctx)
    const _resetBlockLineNum = (blockLineNumLens, ctx) => L.set(blockLineNumLens, BLOCK_LINE_OFF, ctx)
    const defaultCallback = Result.Ok

    return {
        filterBlockResult: (onBlockBegin, onBlockEnd) => {
            onBlockBegin = onBlockBegin || defaultCallback
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
            }
        }
    }
}


// CtxActions
// ctx -> ctx

//createLineAction takes a string manipulation function and return an CtxAction 
//createLineAction :: (str -> str) -> CtxAction
const createLineAction = fn => ctx => L.over(lens.line, fn, ctx)


/**
    ctxResultable2Action :: CtxResultable -> CtxAction 
  
    //::: ctxResultable2Action
    //    
    const ctxResultable2Action = text_block_filter.ctxResultable2Action
    const evenResulter = ctx => ctx.num % 2 === 0 ? Result.Ok(ctx) : Result.Error(ctx)
    const evenAction = ctxResultable2Action(evenResulter)    
    //
    evenResulter({num: 4}).merge().num === 4
    evenAction({num: 4}).num === 4
    //
    evenResulter({num: 3}) instanceof Result.Error
    evenAction({num: 3}).num === 3  
 */
const ctxResultable2Action = resultable => ctx => resultable(ctx).merge()

//------------------------------------------------------------------------

//fromLineContext :: ctx -> str -> ctx
const fromLineContext = line => ctx => compose.all(
    L.set(lens.line, line),
    L.set(lens.original, line),
    L.over(lens.lineNum, utils.inc),
    // log2("contextLine"),
)(ctx)

//createCtxReducer :: CtxResultable -> CtxReducer
const createCtxReducer = resultable => (ctx, line) => compose.all(
    resultable,
    fromLineContext(line),
)(ctx).merge()

//createCtxReducerFromAction :: CtxAction -> CtxReducer
const createCtxReducerFromAction = ctxAction => (ctx, line) => compose.all(
    ctxAction,
    fromLineContext(line),
)(ctx)

//==================================================================================

module.exports = {

    /** signatures:     
      ctx :: { lineNum: number, line: string, original: string }
      
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

    //...helps the IDE with auto-complete
    Lens: {
        original: lens.original,      //original original line
        line: lens.line,    //modified line
        lineNum: lens.lineNum,  //line number
    },

    //createContext :: () -> ctx
    createContext,

    //createBlock :: (regex -> regex -> string) -> BlockObj
    block: createBlockObj,

    //createReducer :: CtxResulter -> CtxReducer
    reducer: createCtxReducer,

    filterResult: createCtxFilter,
    filterLineResult: ctxFilterLine,

    //tapContext :: (ctx {propName: propValue, ...}) => lens propName -> (propType -> _) -> ctx -> ctx
    tapContext: tapCtxLens,
    tapLineContext: tapCtxLineLens,
    overLineContext: overCtxLineLens,



}
