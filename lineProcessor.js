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

let context = {
    fileName: "",
    lineText: "",
    lineNum: 0,
    commentFlag: false,
    stats: {
        failCount: 0,
        totalCount: 0
    },
}

//--------------------------------------------------------------------------------

const impure = {}


impure.prettyPrint = ctx => {
    console.log(`${ctx.lineNum}: ${ctx.output}`)
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
        return inBlockMode ? Result.Ok(ctx)
            : Result.Error(ctx) 
    }
}

//-----------------------------------------------------------------------------------

const processPrint = compose.all(
    // log,
    map(impure.prettyPrint),
    // chain(Result.Error),
    // log,
    chain(impure.filterBlockComment(/^\s*:::.*/, /^\s*$/)),
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

    console.log("--START-----------")
    for (let sn of strs) {
        context = impure.processInputLine(processPrint, context, sn)

    }
    log(context)
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
