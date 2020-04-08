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

const ctxL = L.makeLenses(['input', 'output'])

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

const removeLineComment = line => {
    return line.replace(/^(\s*\/\/)\s*(.*$)/, "$2")
}
impure.removeLineComment = ctx => {
    ctx.output = removeLineComment(ctx.output)
    return ctx
}


impure.filterBlockComment = (beginBlockRegex, endBlockRegex) => {
    let inBlockMode = false
    return ctx => {
        if (inBlockMode) {
            if (endBlockRegex.test(ctx.output)) {
                inBlockMode = false
                return Result.Error(ctx)
            }
        }
        if (!inBlockMode) {
            if (beginBlockRegex.test(ctx.output)) {
                inBlockMode = true
                return Result.Error(ctx)
            }
        }  
        return resultOkErrorIf(ctx, ctx, inBlockMode)
    }
}

//-----------------------------------------------------------------------------------

const processPrint = compose.all(
    // log,
    map(impure.prettyPrint),
    map(addtriStar),
    // chain(Result.Error),
    // log,
    chain(impure.filterBlockComment(/^\s*:::.*/, /^\s*$/)),
    map(impure.removeLineComment),
    // log,
    chain(filterLineComment),
    //log,
    )
    
//==================================================================================

//processInputLine :: (Result res, context ctx) => (res ctx ctx -> res ctx ctx) -> ctx -> string -> ctx
impure.processInputLine = (fn, ctx, line) => {
    ctx.input = line
    ctx.output = line
    ctx.lineNum++
    return fn(Result.Ok(ctx)).merge()
}

impure.app = (s) => {

    const strs = s.split('\n')

    console.log("--START-----------")
    for (let sn of strs) {
        context = impure.processInputLine(processPrint, context, sn)

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
