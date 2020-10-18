const { compose } = require('folktale/core/lambda')
const Result = require('folktale/result')
const { map, chain } = require('pointfree-fantasy')

const tbf = require('../text-block-filter')
const L = require('lenses')
//const utils = require('../utils')


const strs = `
abc
/** 
 * Provides basic arithmetical ops
 * @module Mth
 */

aaaa
// const assert = require('assert')
 

//
//:::jsit 1


  /*
 :::    
//1 === 3
  */
// hello

    /** 
     * subtracts number a from number b
     * 
     * @param {number} a first number
     * @param {number} b second number
     * @return {number} subtraction of two numbers a, b
     * 
     * 
     * @example
     *   //:::
     *   Mth.minus(1, 1) == 0
     *   Mth.minus(1, -1) == 3
     *   //Mth.minus(1, 2) == -1
        assert.strictEqual( Mth.minus(1, 2), -2 )
        const b = 0
        Mth.minus(1, b) == 1 
    */
const minus = (a, b) => {
    return a - b
}

/** add number a to number b
 * @example
  //:::
  //Mth.plus(1, 1) =w= 2 
  Mth.plus(1, -1) == 2 

  Mth.plus(1, 2) == 3 

    // //::: Minus in block comment  
// Mth.minus(10, 2) == 7
    // assert.strictEqual( Mth.minus(10, 20), -1 )

 */
const plus = (a, b) => {
    return a + b
}

/*
k1*/ x

 /*
 k2 
  */

//::: Mth.minus
// //Mth.minus(10, 2) == 7
////Mth.minus(0, 0) == 0
//  assert.strictEqual( Mth.minus(10, 20), -1 )


//:::
//hello

module.exports = {
    plus,
    minus,
}
`

const trimStr = s => s.trim()


const bCommentBlock = tbf.blockCreate(tbf.Regex.JSBlockCommentBegin, tbf.Regex.JSBlockCommentEnd, 'bBlock')
const testBlock = tbf.blockCreate(/^\/\/:::/, tbf.Regex.blankLine, 'testBlock')



const removeBlockCommentStar = line => line.replace(/(\s)*\*(.*)$/, "$1$2")
const blockCommentResulter = compose.all(
    //map(tbf.contextOverLine(s => `_b ${s}`)),

    map(tbf.contextOverLine(
        compose(trimStr, removeBlockCommentStar)
    )),
    bCommentBlock.resulterFilterBlock(
        ctx => Result.Error(tbf.tap(_ => console.log('{'))(ctx)),
        ctx => Result.Error(tbf.tap(_ => console.log('  }'))(ctx)),
    ),
)


const isLineComment = s => tbf.Regex.JSLineComment.test(s)

const removeLineComment = line => line.replace(/^(\/\/)(.*)$/, "$2")
const repairTestHeader = line => line.replace(/^:::(.*)$/, "//:::$1")
const lineCommentResulter = compose.all(
    //map(tbf.contextOverLine(s => `l_ ${s}`)),

    map(tbf.contextOverLine(repairTestHeader)),
    map(tbf.contextOverLine(
        compose(trimStr, removeLineComment)
    )),
    tbf.resulterFilterLine(isLineComment),
)


const testLineResulter = compose.all(
    chain(tbf.resulterFilterLine(s => !isLineComment(s))),
    testBlock.resulterFilterBlock(
        Result.Error,
        ctx => Result.Error(tbf.tap(_ => console.log("TEST END"))(ctx))
    ),
)


const allResulter = compose.all(
    map(tbf.tap(ctx => console.log(`${9 + L.view(tbf.CLens.lineNum, ctx)} :\t'${ctx.line}'`))),

    chain(testLineResulter),
    result => result.orElse(
        lineCommentResulter
    ),
    blockCommentResulter,
    tbf.contextOverLine(trimStr),
)


//-------------------------------------------------------------------------------------


const main = (strArr, contextReducer) => {
    return strArr.reduce(contextReducer, tbf.contextCreate())
}


const reducer = tbf.reducerCreate(allResulter)
console.log(main(strs.split('\n'), reducer))
