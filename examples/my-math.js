/**
 * @module my_math
 */

//const assert = require('assert')

/**
  * Adds number a to b
  * @example
     :::
     my_math.add(1, 2) == 3
     my_math.add(1, 0) == my_math.add(0, 1)  //commutative
     my_math.add(1, "2") === "12"
  */
add = function (a, b) {
    return a + b
}

/**
 * Swaps first two items in array. Returns a new array, the input array remains untouched. 
 *
 * swapA :: [a] -> [a]
 *
 * @example
 ::: 
 var a = [1, 2, 3]; assert.deepEqual(my_math.swapA(a), [2, 1, 3]); assert.deepEqual(a, [1, 2, 3])
 *
 */
const swapA = ([a, b, ...tail]) => [b, a, ...tail]

module.exports = {
    add,
    swapA,
}
