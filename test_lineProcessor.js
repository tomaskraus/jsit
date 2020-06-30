/**
 * test 
 */

const { compose, curry } = require('folktale/core/lambda')
const Result = require('folktale/result')
const { map } = require('pointfree-fantasy')
const lp = require("./lineProc")
const L = require('lenses')



const app = (context, action, s) => {
    const strs = s.split('\n')
    const reducer = lp.factory.createCtxReducer(action)
    console.log("--START-----------")

    const resultCtx = strs.reduce(reducer, context)
    // log2("after processLine", context)

    console.log("--END-----------")
    return resultCtx
}













































































const str = `
/**
 * 
 * :::
 * Mth.a = [1,2,3]
 * Mth = "aabbcc"
 * console.log(Mth.a.toString())
 */
/*
    hello
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
const testLineAction = compose.all(
    res => res.merge(),
    map(lp.mapper.echoOutputLine),

    map(lp.mapper.addLineNum),
    // lp.log,
    lp.factory.createCtxBlockResulter(lp.regex.beginJSBlockComment, lp.regex.endJSBlockComment, lp.lens.JSBlockCommentLineNum,
        {}),
    // { onBlockEnd: ctx => { lp.log("----------block end"); return Result.Error(ctx) } } )
    // lp.filter.JSBlockComment,
    //lp.filter.lineComment

)

console.log(app(lp.factory.createContext(), testLineAction, str))

