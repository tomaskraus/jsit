/**
 * Everything ablut single line processing
 * 
 * @module lineProcessor
 */


const { compose, curry } = require('folktale/core/lambda')
const Result = require('folktale/result')

const impure = {}


impure.processInputLine = (fn, ctx, line) => {
    ctx.input = line
    ctx.output = line
    ctx.lineNum++
    return fn(ctx)
}

impure.prettyPrint = ctx => {
    console.log(`${ctx.lineNum}-\t${ctx.output}`)
    return ctx
}

impure.addtriStar = ctx => {
    ctx.output = '*** ' + ctx.output
    return ctx
}


// filterLine :: (ctx c) => regex -> c -> c
impure.filterLine = regex => ctx => {
    ctx.output = regex.test(ctx.output) ? ctx.output   //passed
        : ''
    return ctx
}
    

const lineCommentRegex = /^\s*\/\//


//==================================================================================

const processPrint = compose.all(
    impure.prettyPrint,
    impure.addtriStar,
    impure.filterLine(lineCommentRegex),
)
   


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
