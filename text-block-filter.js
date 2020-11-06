/**
 * Basics of "block of lines" processing, for textual data - in a functional way.
 * 
 * You can:
 * - create line filters and modifiers
 * - create "block filters" by specifying block marks (beginning and end) via RegExp.
 * - compose these line modifiers and filters (both block and line) together
 * - implement block-related callbacks
 *
 * 
 * There are bunch of objects:
 *   - Context (a.k.a. ctx)
 *   - Resulter
 *   - Block
 *   - Reducer
 * 
 * 
 * Context (abbr. ctx) is the object, that stores the state of a textual data processed.
 *   It has three main properties:
 *      - lineNum: (number) a line number (row counter)
 *      - line: (string) line read, possibly "modified" by some functions later
 *      - original: (string) the original line read
 * 
 *   Context :: { lineNum: number, line: string, original: string }
 * 
 *   create a new, initialized Context by using the factory function, without parameters:
 *     contextCreate()
 * 
 * 
 * Resulter is every function, that accepts a Context and returns a Result monad (Folktale's Result object), 
 * containing a new Context:
 *   Result :: https://folktale.origamitower.com/api/v2.3.0/en/folktale.result.html
 *   Resulter :: ctx -> Result ctx ctx
 * 
 *   Resulter can act as a Context filter or Context "modifier", returning a Result with new, different Contexts
 *
 * 
 * Block is an object which recognize a multi-lined text block, surrounded by begin and end text marks.
 *  usage:
 *      1. create a Block object:
 *          blockCreate :: (RegExp -> RegExp -> string) -> Block
 *      2. call Block.resulterFilterBlock method (provide BlockCallbacks) to create its CtxBlockResulter
 *        Block.resulterFilterBlock :: (Resulter onBlockBegin, onBlockEnd) 
 *          => (onBlockBegin -> onBlockEnd) -> ctx -> Result ctx ctx
 * 
 *        BlockCallbacks are Resulters, which are called when a line with beginning/end mark occurs
 *          - onBlockBegin
 *          - onBlockEnd
 * 
 *   
* Reducer: a function that takes a Context (a.k.a. ctx) and a line (string), 
 * and returns the new Context, possibly modified by some Resulter provided
 * 
 *   Reducer :: (ctx, string) -> ctx
 * 
 *   create the Reducer by using the factory function:
 *      reducerCreate :: Resulter -> Reducer
 * 
 * 
 * @module text_block_filter
 */

// TODO: consider using Sanctuary instead of folktale
// https://sanctuary.js.org

const { compose, curry } = require('folktale/core/lambda')
const Result = require('folktale/result')
const Lens = require('lenses')


// regexes ----------------------------

const blankLineRegex = /^\s*$/s
const JSLineCommentRegex = /^\/\//
// TODO: add detection of one-line  block comment /*    */
const beginJSBlockCommentRegex = /^\/\*/
const endJSBlockCommentRegex = /^.*\*\//


//contextCreate :: () -> ctx
const contextCreate = () => ({
    lineNum: 0,     //line number (row counter)
    line: '',       //line read
    original: '',   //original line read (for read only purpose)
})

// context lenses (to access ctx's fields)
const Lns = Lens.makeLenses([
    'lineNum',  //line number (counter)
    'line',     //line read
    'original', //original line read (for read only purpose)
])


//createLens :: string -> Lens
const createLens = idOfNewLens => Lens.makeLenses([idOfNewLens])[idOfNewLens]

/**
    Runs a custom function with a one argument.
    Returns that argument, unchanged.

    tap :: (a -> any) -> a -> a

    @example
    //::: tap
    const lib = text_block_filter  //module
    //
    let g = 1                               //define some "global" variable
    const ctx = {line: "work"}              //our original context  
    const pluralize = c => {g = 2; return {line: c.line + 's'}}  //some function with side effects
    //
    const newCtx = lib.tap(pluralize, ctx)
    //
    assert.equal(newCtx.line, ctx.line)   //context state should stay unchanged
    assert.equal(g, 2)   //side effects are visible
*/
const tap = curry(2, (fn, a) => {
    fn(a)
    return a
})

/**
    Runs a custom string manipulation function fn with a "line property of a context ctx" as an argument.
    Returns that context unchanged.

    contextTap :: ({line: string, ...} ctx) => (string -> _) -> ctx -> ctx

    @example
    //::: contextTapLine 
    let g = 1                               //define some "global" variable
    const ctx = {line: "work"}              //our original context  
    const pluralize = s => {g = 2; return s + 's'}  //some function with side effects
    const newCtx = text_block_filter.contextTapLine(pluralize, ctx)
    assert.equal(newCtx.line, ctx.line)   //context state should stay unchanged
    assert.equal(g, 2)   //side effects are visible
*/
const contextTapLine = curry(2,
    (fn, ctx) => {
        fn(Lens.view(Lns.line, ctx))
        return ctx
    }
)


/**
    Runs a custom string manipulation function fn that takes a "line property of a context ctx" as an argument. 
    Returns a new context, with its "line" property set to the result of that function fn.

    contextOverLine :: ({line: string, ...} ctx) => (string -> any) -> ctx -> ctx

    @example
    //::: contextOverLine
    const ctx = {line: "work"}              //our original context   
    const newCtx = text_block_filter.contextOverLine(s => s + 's', ctx)
    assert.equal(newCtx.line, 'works')   //context line should be changed
*/
const contextOverLine = curry(2, (fn, ctx) => Lens.over(Lns.line, fn, ctx))


/**
    Runs a function fn with a "some property "p" of a context ctx" as an argument. 
    Returns a new context, with its "p" property set to the result of that function fn.
    That function fn should check if value "p" is present.

    contextOverLine :: ({p: a, ...} ctx) => lens -> (a -> a) -> ctx -> ctx

    @example
    //::: contextOver   
    const newCtx = text_block_filter.contextOver(text_block_filter.L.lineNum, i => i + 1, {lineNum: 2})
    assert.equal(newCtx.lineNum, 2)   //should be changed
*/
const contextOver = curry(3, (lens, fn, ctx) => Lens.over(lens, fn, ctx))


/** 
 *    Given a context condition function fn, creates a Context filter, so that:
 *  For any Context ctx, returns a negative Result, if condition fn returns false.
 * 
 *  resulterFilter :: (ctx -> boolean) -> Resulter
 * 
 *  @example
 *  //::: resulterFilter
 *  const lib = text_block_filter   //library
 *  //
 *  const oddLineNumResulter = lib.resulterFilter(ctx => ctx.lineNum % 2 === 1)
 *  //
 *  oddLineNumResulter({ lineNum: 3}) instanceof lib.Result.Ok      //oddLineNumResulter match odd lineNum example
 *  oddLineNumResulter({ lineNum: 4}) instanceof lib.Result.Error   //oddLineNumResulter does not match even lineNum example
 *
 */

//
const resulterFilter = ctxTestFn => ctx => ctxTestFn(ctx) === true
    ? Result.Ok(ctx)
    : Result.Error(ctx)

//resulterFilterLine :: (string -> boolean) -> Resulter
const resulterFilterLine = strTestFn => resulterFilter(ctx => strTestFn(Lens.view(Lns.line, ctx)))


const blockBoundaryCreate = (beginBlockRegex, endBlockRegex) => {
    return {
        beginBlockRegex,
        endBlockRegex,
    }
}

const blockCallbacksCreate = (onBlockBegin, onBlockEnd) => {
    return {
        onBlockBegin,
        onBlockEnd,
    }
}


const defaultCallback = Result.Ok
const _BLOCK_LINE_OFF = -1
const setBlockLineNum = (blockLineNumLens, ctx) => Lens.set(blockLineNumLens, Lens.view(Lns.lineNum, ctx), ctx)
const resetBlockLineNum = (blockLineNumLens, ctx) => Lens.set(blockLineNumLens, _BLOCK_LINE_OFF, ctx)
const isBlockDiscontinued = (bLineNum, ctx) => (bLineNum != _BLOCK_LINE_OFF)
    && (Lens.view(Lns.lineNum, ctx) > bLineNum + 1)
const isBlockAdjacentOrFurther = (bLineNum, ctx) => (bLineNum != _BLOCK_LINE_OFF)
    && (Lens.view(Lns.lineNum, ctx) >= bLineNum + 1)

const blockParserCreator = (blockBoundary, blockCallbacks, id) => {

    const onBlockBegin = blockCallbacks.onBlockBegin || defaultCallback
    const onBlockEnd = blockCallbacks.onBlockEnd || defaultCallback
    const lensBlockLineNum = createLens(id)


    const resulterFilter = ctx => {
        const blockLineNum = Lens.view(lensBlockLineNum, ctx) || _BLOCK_LINE_OFF
        const line = Lens.view(Lns.line, ctx)
        //begin block
        if (blockBoundary.beginBlockRegex.test(line)) {
            if (isBlockAdjacentOrFurther(blockLineNum, ctx)) {
                const ctx2 = onBlockEnd(ctx).merge()
                return Result.Ok(setBlockLineNum(lensBlockLineNum, ctx2))
                    .chain(onBlockBegin)
            }
            return Result.Ok(setBlockLineNum(lensBlockLineNum, ctx))
                .chain(onBlockBegin)
        }
        // block is not detected
        if (blockLineNum == _BLOCK_LINE_OFF) {
            return Result.Error(ctx)
        }
        // block must be continuous
        if (isBlockDiscontinued(blockLineNum, ctx)) {
            return Result.Ok(resetBlockLineNum(lensBlockLineNum, ctx))
                .chain(onBlockEnd)
        }
        //end block
        if (blockBoundary.endBlockRegex.test(line)) {
            return Result.Ok(resetBlockLineNum(lensBlockLineNum, ctx))
                .chain(onBlockEnd)
        }
        return Result.Ok(setBlockLineNum(lensBlockLineNum, ctx))
    }


    const contextFlush = ctx => {
        if (Lens.view(lensBlockLineNum, ctx) > _BLOCK_LINE_OFF) {   //also handles undefined lensBlockLineNum value
            return Result.Ok(resetBlockLineNum(lensBlockLineNum, ctx))
                .chain(onBlockEnd)
                .merge()
        }
        return ctx
    }


    const isInBlock = ctx => Lens.view(lensBlockLineNum, ctx) > 0


    return {
        resulterFilter,
        contextFlush,
        isInBlock,
    }
}


//------------------------------------------------------------------------

//contextNextLine :: ctx -> str -> ctx
const contextNextLine = curry(2, (line, ctx) => compose.all(
    Lens.set(Lns.line, line),
    Lens.set(Lns.original, line),
    Lens.over(Lns.lineNum, i => i + 1),
)(ctx)
)

//reducerCreate :: Resulter -> Reducer
const reducer = resulter => (ctx, line) => compose.all(
    resulter,
    contextNextLine(line),
)(ctx).merge()


//==================================================================================

/**
 * module help
 */
module.exports = {

    /** signatures:
         
      Regex : bunch of predefined JavaScript RegExp objects
      Lens : https://github.com/DrBoolean/lenses
      Context (a.k.a. ctx) :: { lineNum: number, line: string, original: string }
      CLens : Context fields accessor { lineNum, line, original }
      Result : https://folktale.origamitower.com/api/v2.3.0/en/folktale.result.html
      Resulter :: ctx -> Result ctx ctx  
      BlockBoundary :: { beginBlockRegex: RegExp, endBlockRegex: RegExp }
      BlockCallbacks :: { onBlockBegin: Resulter, onBlockEnd: Resulter }
      : blockParser object
      Reducer :: (ctx, string) -> ctx

    */


    /**
     * predefined regular expressions
     */
    Regex: {
        JSBlockCommentBegin: beginJSBlockCommentRegex,
        JSBlockCommentEnd: endJSBlockCommentRegex,
        JSLineComment: JSLineCommentRegex,
        blankLine: blankLineRegex,
    },

    // lens object
    Lens,

    /**
     * Context properties accessor - context lenses
     */
    L: {
        original: Lns.original,   //original original line
        line: Lns.line,           //modified line
        lineNum: Lns.lineNum,     //line number
    },

    createLens,


    contextCreate,
    contextTapLine,
    contextOverLine,
    contextOver,

    //Result object
    Result,

    resulterFilterLine,
    resulterFilter,

    blockBoundaryCreate,
    blockCallbacksCreate,
    BlockParser: {
        create: blockParserCreator,
    },

    reducer,


    tap,
}
