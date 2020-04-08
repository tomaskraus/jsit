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

//resultOkErrorIf :: a -> a -> (_ -> bool) -> Result a a
const resultOkErrorIf = curry(3,
    (OkVal, ErrorVal, fn) => fn ? Result.Ok(OkVal)
        : Result.Error(ErrorVal)
)

const log = obj => {
    console.log("LOG", obj)
    return obj
}


//--------------------------------------------------------------------------------

let context = {
    fileName: "",
    lineText: "",
    lineNum: 0,
    commentFlag: false,
    stats: {
        failCount: 0,
        totalCount: 0
    },
    input: "",
    output: "",
}

const ctxL = L.makeLenses(['input', 'output', 'lineNum', 'blockMode'])

//--------------------------------------------------------------------------------

const impure = {}


impure.prettyPrint = ctx => {
    console.log(`${ctx.lineNum}: ${ctx.output}`)
    return ctx
}

const addtriStar = ctx => L.over(ctxL.output, s => `*** ${s}`, ctx)


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
    if (inBlockMode) {
        if (endBlockRegex.test(ctx.output)) {
            return Result.Error(L.set(ctxL.blockMode, false, ctx))
        }
    }
    if (beginBlockRegex.test(ctx.output)) {
        return Result.Error(L.set(ctxL.blockMode, true, ctx))
    }
    return resultOkErrorIf(ctx, ctx, inBlockMode)
}


const filterTestComment = filterBlockComment(beginTestCommentMark, endTestCommentMark)

//-----------------------------------------------------------------------------------

const processPrint = compose.all(
    map(impure.prettyPrint),
    map(addtriStar),
    // chain(Result.Error),
    chain(filterTestComment),
    map(removeLineCommentCtx),
    filterLineComment,
    //log,
)

//==================================================================================


//processInputLine :: (ctx -> Result ctx ctx) -> ctx -> string -> ctx
const processInputLine = (fn, ctx, line) => compose.all(
    fn,
    L.set(ctxL.output, line),
    L.set(ctxL.input, line),
    L.over(ctxL.lineNum, x => x + 1),
)(ctx)


impure.app = (s) => {

    const strs = s.split('\n')

    console.log("--START-----------")
    for (let sn of strs) {
        context = processInputLine(processPrint, context, sn).merge()

    }
    // log(context)
    console.log("--END-----------")
}

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

impure.app(str)
