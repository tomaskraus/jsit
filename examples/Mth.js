/** 
 * Provides basic arithmetical ops
 * @module Mth
 */

// const assert = require('assert')

//
//:::jsit 1


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
 *   Mth.minus(1, 1) == 0
 *   Mth.minus(1, -1) == 3
 *   Mth.minus(1, 2) == -1
    assert.strictEqual( Mth.minus(1, 2), -2 )
    Mth.b = 0
    Mth.minus(1, Mth.b) == 1
 *
 * 
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


//::: Mth.minus
// //Mth.minus(10, 2) == 7
// assert.strictEqual( Mth.minus(10, 20), -1 )


module.exports = {
    plus,
    minus,
}
