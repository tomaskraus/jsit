/**
 * test 
 */

const { compose, curry } = require('folktale/core/lambda')
// const Result = require('folktale/result')
const { map } = require('pointfree-fantasy')
const lp = require("./lineProc")
const L = require('lenses')



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
    abc

// let 2 = 3    //should not be tested, because is not follow the test block without an interruption
//
//  :::
//nonsense
//  // commentary
////
// //
//  // 
// continues
// 
// 

//
//:::

// let 3 = 3    //should not be tested, because is not follow the test block without an interruption


// let 3 = 4    //should not be tested, because is not follow the test block without an interruption
//

//:::
// let 4 = 5    

//
//:::
// let 5 = 6    

//:::
// let 5 = 6    
//

/*
---
hu!
---
*/

//
//:::
// let 5 = 6    
//

//
//:::
//
// let 6 = 7    //should not be tested, because is not follow the test block without an interruption    

//
//:::
//
// let 7 = 8    //should not be tested, because is not follow the test block without an interruption 


//
//:::
// let 8 = 9   
//:::
// let 10 = 11

//
//:::
// 
//last
//
`

// const handler = printAllHandler
const handler = compose.all(   
    map(lp.mappers.echoOutputLine),

    map(lp.mappers.addLineNum),
    // lp.log,
    lp.handlers.filterBlockHandler
)

app(lp.createContext(), handler, str)

