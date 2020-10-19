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


const { compose, curry } = require('folktale/core/lambda')
const Result = require('folktale/result')
const L = require('lenses')


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
const cLens = L.makeLenses([
    'lineNum',  //line number (counter)
    'line',     //line read
    'original', //original line read (for read only purpose)
])


/**
    Runs a custom function with a one argument.
    Returns that argument, unchanged.

    tap :: (a -> any) -> a -> a

    //::: tap   
    const newCtx = text_block_filter.tap(text_block_filter.CLens.original, x => x + 1, {original: 1})
    assert.equal(newCtx.original, 1)   //should stay unchanged
*/
const tap = fn => a => {
    fn(a)
    return a
}

/**
    Runs a custom string manipulation function fn with a "line property of a context ctx" as an argument.
    Returns that context unchanged.

    contextTap :: ({line: string, ...} ctx) => (string -> _) -> ctx -> ctx

    //::: contextTap   
    const newCtx = text_block_filter.contextTap(text_block_filter.CLens.line, s => s + 's', {line: "work"})
    assert.equal(newCtx.line, 'work')   //should stay unchanged
*/
const contextTapLine = fn => ctx => {
    fn(L.view(cLens.line, ctx))
    return ctx
}

/**
    Runs a custom string manipulation function fn with a "line property of a context ctx" as an argument. 
    Returns a new context, with its "line" property set to the result of that function fn.

    contextOverLine :: ({line: string, ...} ctx) => (string -> _) -> ctx -> ctx

    @example
    //::: contextOverLine   
    const newCtx = text_block_filter.contextOverLine(s => s + 's', {line: "work"})
    assert.equal(newCtx.line, 'works')   //should be changed
*/
const contextOverLine = fn => ctx => L.over(cLens.line, fn, ctx)

/**
    Runs a function fn with a "some property "p" of a context ctx" as an argument. 
    Returns a new context, with its "p" property set to the result of that function fn.
    That function fn should check if value "p" is present.

    contextOverLine :: ({p: a, ...} ctx) => (a -> a) -> ctx -> ctx

    @example
    //::: contextOver   
    const newCtx = text_block_filter.contextOver(text_block_filter.CLens.lineNum, i => i + 1, {lineNum: 2})
    assert.equal(newCtx.lineNum, 2)   //should be changed
*/
const contextOver = curry(3, (lens, fn, ctx) => L.over(lens, fn, ctx))


//resulterFilter :: (ctx -> boolean) -> Resulter
const resulterFilter = ctxTestFn => ctx => ctxTestFn(ctx) === true
    ? Result.Ok(ctx)
    : Result.Error(ctx)

//resulterFilterLine :: (string -> boolean) -> Resulter
const resulterFilterLine = strTestFn => resulterFilter(ctx => strTestFn(L.view(cLens.line, ctx)))


const blockParamsCreate = (beginBlockRegex, endBlockRegex, id) => {
    return {
        beginBlockRegex,
        endBlockRegex,
        id,
    }
}


class BlockParser {
    
    constructor(onBlockBegin, onBlockEnd, blockParams) {
        this._onBlockBegin = onBlockBegin || BlockParser._defaultCallback
        this._onBlockEnd = onBlockEnd || BlockParser._defaultCallback
        this._block = blockParams
        
        this._lensBlockLineNum = L.makeLenses([this._block.id])[this._block.id]
    }
    
    static _defaultCallback = Result.Ok
    static _BLOCK_LINE_OFF = -1
    static _setBlockLineNum = (blockLineNumLens, ctx) => L.set(blockLineNumLens, L.view(cLens.lineNum, ctx), ctx)
    static _resetBlockLineNum = (blockLineNumLens, ctx) => L.set(blockLineNumLens, BlockParser._BLOCK_LINE_OFF, ctx)

    static create(onBlockBegin, onBlockEnd, block) {
        return new BlockParser(onBlockBegin, onBlockEnd, block)
    }

    resulterFilter = ctx => {
        const blockLineNum = L.view(this._lensBlockLineNum, ctx) || BlockParser._BLOCK_LINE_OFF
        const line = L.view(cLens.line, ctx)
        //begin block
        if (this._block.beginBlockRegex.test(line)) {
            // console.log(ctx)
            return Result.Ok(BlockParser._setBlockLineNum(this._lensBlockLineNum, ctx))
                .chain(this._onBlockBegin)
        }
        // block is not detected
        if (blockLineNum == BlockParser._BLOCK_LINE_OFF) {
            return Result.Error(ctx)
        }
        // block must be continuous
        if (L.view(cLens.lineNum, ctx) > blockLineNum + 1) {
            // return Result.Error(_resetBlockLineNum(blockLineNumLens, ctx))
            return Result.Ok(BlockParser._resetBlockLineNum(this._lensBlockLineNum, ctx))
                .chain(this._onBlockEnd)
        }
        //end block
        if (this._block.endBlockRegex.test(line)) {
            return Result.Ok(BlockParser._resetBlockLineNum(this._lensBlockLineNum, ctx))
                .chain(this._onBlockEnd)
        }
        return Result.Ok(BlockParser._setBlockLineNum(this._lensBlockLineNum, ctx))
    }

    contextFlush = ctx => {
        if (L.view(this._lensBlockLineNum, ctx) == BlockParser._BLOCK_LINE_OFF) {
            return ctx
        }
        return Result.Ok(BlockParser._resetBlockLineNum(this._lensBlockLineNum, ctx))
            .chain(this._onBlockEnd)
            .merge()
    }
}


//------------------------------------------------------------------------

//contextNextLine :: ctx -> str -> ctx
const contextNextLine = curry(2, (line, ctx) => compose.all(
    L.set(cLens.line, line),
    L.set(cLens.original, line),
    L.over(cLens.lineNum, i => i + 1),
)(ctx)
)

//reducerCreate :: Resulter -> Reducer
const reducerCreate = resulter => (ctx, line) => compose.all(
    resulter,
    contextNextLine(line),
)(ctx).merge()


//==================================================================================

/**
 * module help
 */
module.exports = {

    /** signatures:
         
      Context (abbr. ctx) :: { lineNum: number, line: string, original: string }
      CLens : Context fields accessor
      Regex : bunch of predefined JavaScript RegExp objects
      Result :: https://folktale.origamitower.com/api/v2.3.0/en/folktale.result.html
      Resulter :: ctx -> Result ctx ctx  
      BlockParams :: { beginBlockRegex: RegExp, endBlockRegex: RegExp, id: string }
      BlockParser : blockParser object
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
    Lens: L,

    /**
     * Context properties accessor
     */
    CLens: {
        original: cLens.original,   //original original line
        line: cLens.line,           //modified line
        lineNum: cLens.lineNum,     //line number
    },

    
    tap,
    
    contextCreate,
    contextTapLine,
    contextOverLine,
    contextOver,
    
    blockParamsCreate,
    BlockParser,
    
    resulterFilterLine,
    resulterFilter,

    reducerCreate,

}
