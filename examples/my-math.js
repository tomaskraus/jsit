/**
 * @module my_math
 */

//const assert = require('assert')

/**
  * Adds number a to b
  * @example
     //:::
     my_math.add(1, 2) == 5
     my_math.add(1, 0) == my_math.add(0, 1)  //commutative
     my_math.add(1, "2") === "12"
  */
add = function (a, b) {
    return a + b
}

/**
  * Adds number a to b
  * @example
  *   //:::
  *   my_math.add2(1, 2) == 4
  * 
  *   //:::
  *   my_math.add2(1, 0) == my_math.add2(0, 1)  //commutative
  *   my_math.add2(1, "2") === "12"
  */
 add2 = function (a, b) {
  return a + b
}


/**
 * Swaps first two items in array. Returns a new array, the input array remains untouched. 
 *
 * swapA :: [a] -> [a]
 *
 * @example
 //::: 
 let a = [1, 2, 3], b = [4, 5] //define some variables
 let c = 1
 const m = my_math
 assert.deepEqual(m.swapA(a), [2, 1, 3])
 const arr = [1, 2, 3] 
 assert.deepEqual(arr, a)
 assert.equal(c, 1)
 //::: 
 var d = 10 
 var e = 20
 //
 my_math.add(e, d) == 12
 *
 */
const swapA = ([a, b, ...tail]) => [b, a, ...tail]

module.exports = {
    add,
    add2,
    swapA,
}
