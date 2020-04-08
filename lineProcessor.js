/**
 * Everything about single line processing
 * 
 * @module lineProcessor
 */


const { compose, curry } = require('folktale/core/lambda')
const Result = require('folktale/result')

//--auxiliary pointfree------------------------------------------------------------------------------

const map = curry(2, (fn, functor) => functor.map(fn))
const chain = curry(2, (fn, monad) => monad.chain(fn))

const log = obj => { 
    console.log("LOG", obj)
    return obj
}

//--------------------------------------------------------------------------------

const impure = {}


impure.prettyPrint = ctx => {
    console.log(`${ctx.lineNum}:\t${ctx.output}`)
    return ctx
}

impure.addtriStar = ctx => {
    ctx.output = '*** ' + ctx.output
    return ctx
}


// filterLine :: (context ctx, Result Res) => regex -> ctx -> Res ctx
impure.filterLine = regex => ctx => {
    if (regex.test(ctx.output)) {
        return Result.Ok(ctx)
    }
    return Result.Error(ctx)
}     

const lineCommentRegex = /^\s*\/\//

const filterLineComment = impure.filterLine(lineCommentRegex)

const removeLineComment = line => {
    return line.replace(/^(\s*\/\/)\s(.*$)/, "$2")
}
impure.removeLineComment = ctx => {
    ctx.output = removeLineComment(ctx.output)
    return ctx
}

//-----------------------------------------------------------------------------------

const processPrint = compose.all(
    // log,
    map(impure.prettyPrint),
    // map(impure.addtriStar),
    // chain(Result.Error),
    // log,
    map(impure.removeLineComment),
    // log,
    chain(filterLineComment),
    //log,
    )
    
//==================================================================================

//processInputLine :: (Result res, context ctx) => (res ctx -> res ctx) -> ctx -> string -> ctx
impure.processInputLine = (fn, ctx, line) => {
    ctx.input = line
    ctx.output = line
    ctx.lineNum++
    return fn(Result.Ok(ctx)).merge()
}

impure.app = (s) => {

    const strs = s.split('\n')

    let ctx = { lineNum: 0, output: null }
    console.log("--START-----------")
    for (let sn of strs) {
        ctx = impure.processInputLine(processPrint, ctx, sn)

    }
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
`

impure.app(str)
