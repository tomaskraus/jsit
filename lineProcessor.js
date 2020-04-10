/**
 * Everything about single line processing
 * 
 * @module lineProcessor
 */


const { compose, curry } = require('folktale/core/lambda')
const Result = require('folktale/result')
const L = require('lenses')

//--auxiliary pointfree------------------------------------------------------------------------------

const map = curry(2, (fn, functor) => functor.map(fn))
const chain = curry(2, (fn, monad) => monad.chain(fn))
const merge = monad => monad.merge()

//resultOkErrorIf :: a -> a -> (_ -> bool) -> Result a a
const resultOkErrorIf = curry(3,
    (OkVal, ErrorVal, fn) => fn ? Result.Ok(OkVal)
        : Result.Error(ErrorVal)
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

const ctxL = L.makeLenses(['input', 'output', 'lineNum', 'blockMode'])

//--------------------------------------------------------------------------------

const impure = {}


impure.prettyPrint = ctx => {
    console.log(`${ctx.lineNum}: ${ctx.output}`)
    return ctx
}


// filterLine :: (context ctx, Result Res) => regex -> ctx -> Res ctx ctx
const filterLine = regex => ctx => resultOkErrorIf(ctx, ctx, regex.test(ctx.output))

const lineCommentRegex = /^\s*\/\//
const filterLineComment = filterLine(lineCommentRegex)

const removeLineComment = line => line.replace(/^(\s*\/\/)\s*(.*$)/, "$2")
const removeLineCommentCtx = ctx => L.over(ctxL.output, removeLineComment, ctx)

// TODO: add detection of one-line  block comment /*    */
const beginJSCommentMark = /a/
const endJSCommentMark = /b/

const beginTestCommentMark = /^\s*:::.*/
const endTestCommentMark = /^\s*$/

const filterBlockComment = (beginBlockRegex, endBlockRegex) => ctx => {
    const inBlockMode = (L.view(ctxL.blockMode, ctx))
    if (inBlockMode && endBlockRegex.test(ctx.output)) {
        return Result.Error(L.set(ctxL.blockMode, false, ctx))
    }
    if (beginBlockRegex.test(ctx.output)) {
        return Result.Error(L.set(ctxL.blockMode, true, ctx))
    }
    return resultOkErrorIf(ctx, ctx, inBlockMode)
}


const filterTestComment = filterBlockComment(beginTestCommentMark, endTestCommentMark)

//-----------------------------------------------------------------------------------

//filterTestLine :: ctx -> Result ctx
const filterTestLine = compose.all(
    // log,
    chain(filterTestComment),
    map(removeLineCommentCtx),
    filterLineComment,
)

//==================================================================================

//updateContextLine :: ctx -> str -> ctx
const updateContextLine = line => ctx => compose.all(
    L.set(ctxL.output, line),
    L.set(ctxL.input, line),
    L.over(ctxL.lineNum, x => x + 1),
    // log2("contextLine"),
)(ctx)


//processLine :: (ctx -> ctx) -> s -> ctx -> ctx
const processLine = (handler, line, context) => compose.all(
    handler,
    //log2("before Handler"),
    //tap(console.log),
    updateContextLine(line),
    // log2("start processLine"),
)(context)

impure.app = curry(2, (context, processHandler, s) => {
    const strs = s.split('\n')

    console.log("--START-----------")
    for (let sn of strs) {
        context = processLine(processHandler, sn, context)
        // log2("after processLine", context)
    }
    // log(context)
    console.log("--END-----------")
})

const str = `
/**
 * 
 * :::
 * Mth.a = [1,2,3]
 * Mth = "aabbcc"
 * console.log(Mth.a.toString())
 */

let hello = "hello"


//     
// ::: 
// let Mth = {}
// Mth.a = [1,2,3]
// //Mth = "aabbcc"
// console.log(Mth.a.toString())
// 
//  :::
//

//
//
//:::

//     
// ::: 
// let 2 = 3
//
//  :::
//nonsense
//  // commentary
// continues
// 
// 

//
//:::
//
//last
//
`

const testLineHandler = compose.all(
    merge,
    map(impure.prettyPrint),
    filterTestLine,
)

const printAllHandler = ctx => tap(compose(console.log, L.view(ctxL.input)), ctx)



// const handler = printAllHandler
const handler = testLineHandler

impure.app(createContext(), handler, str)
