/**
 * Everything ablut single line processing
 * 
 * @module lineProcessor
 */


const { lambda, object } = require('folktale/core')
const Maybe = require('folktale/maybe')

const impure = {}



const process = (line, ctx) => {
    ctx
    ctx.line = line

    return ctx
}


//==================================================================================

impure.app = (s) => {
    
    const strs = s.split('\n')
    
    let ctx = { lineNum: 0 }
    console.log("--START-----------")
    for (let sn of strs) {
        ctx.lineNum++
        ctx = process(sn, ctx)
        console.log(`${ctx.lineNum}-\t${ctx.line}`)
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
