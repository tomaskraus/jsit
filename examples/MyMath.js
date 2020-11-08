/**
 * @module my_math
 */

//const assert = require('assert')

/**
  * Adds number a to b
  * @example
     //:::
     add(1, 2) =w= 5
     add(1, 0) == add(0, 1)  //commutative
     add(1, "2") === "12"
  */
 const add = function (a, b) {
    return a + b
}

/**
  * Adds number a to b
  * @example
  *   //:::
  *   add2(1, 2) == 4
  * 
  *   //::: add
  *   add2(1, 0) == add2(0, 1)  //commutative
  *   add2(1, "2") === "12"
  */
 const add2 = function (a, b) {
  return a + b
}


/**
 * Swaps first two items in array. Returns a new array, the input array remains untouched. 
 *
 * swapA :: [a] -> [a]
 *
 * @example
 * //::: swapA
 * let a = [1, 2, 3], b = [4, 5] //define some variables
 * let c = 1
 * assert.deepEqual(swapA(a), [2, 1, 3])
 *
 */
const swapA = ([a, b, ...tail]) => [b, a, ...tail]

module.exports = {
    add,
    add2,
    swapA,
}
