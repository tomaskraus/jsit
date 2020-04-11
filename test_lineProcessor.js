/**
 * test 
 */

const { compose, curry } = require('folktale/core/lambda')
// const Result = require('folktale/result')
const { map } = require('pointfree-fantasy')
const lp = require("./lineProcessor")



const app = (context, handler, s) => {
    const strs = s.split('\n')

    console.log("--START-----------")
    for (let sn of strs) {
        context = lp.processLine(handler, sn, context)
        // log2("after processLine", context)
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


// const handler = printAllHandler
const handler = compose.all(   
    map(lp.mappers.echoOutputLine),
    // lp.log,
    lp.handlers.extractTestLine,
)

app(lp.createContext(), handler, str)

