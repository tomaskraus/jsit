/** 
 * Provides basic arithmetical ops
 * @module Mth
 */

// const assert = require('assert')

//
//:::jsit 1
// 1 == 1

/*
 :::    
//1 === 3
 */


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
 *   minus(1, 1) == 0
 *   Mth.minus(1, -1) == 2
 *   minus(1, 2) == -1    
    //:::
    assert.strictEqual( minus(1, 2), -1 )
    b = 2
    let c = 1
    assert.strictEqual( minus(c, b), -1 )

    //:::
    assert.strictEqual( minus(1, 2), -2 )
    b = 0
    minus(1, b) == 1
 *
 * 
 */
const minus = (a, b) => {
    return a - b
}

/** add number a to number b
 * @example
  //:::
  //plus(1, 1) =w= 2 
  plus(1, -1) == 2 
  plus(1, 2) == 3 

// //::: Minus in block comment  
// minus(10, 2) == 7
// assert.strictEqual( minus(10, 20), -1 )

 */
const plus = (a, b) => {
    return a + b
}


//::: minus
// //minus(10, 2) == 7
// assert.strictEqual( minus(10, 20), -1 )
//::: minus
// //minus(10, 2) == 7
// assert.strictEqual( minus(10, 20), -1 )

//::: minus
// //minus(10, 2) == 7
// assert.strictEqual( minus(10, 20), -1 )


minus10 = (a) => a - 10

module.exports = {
    plus,
    minus,
}


//::: minus10
// minus10(6) == -4