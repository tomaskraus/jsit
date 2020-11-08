/**
 * @module my_math
 */


//::: our tests for the "add" function
// add(1, 2) === 3
// add(1, 0) === add(0, 1)  //is commutative
// add(1, "2") === "12"     //can do a string concatenation
const add = function (a, b) {
    return a + b
}


/**
  * Adds number a to b
  * 
  * @example
  *   //::: add2
  *   add2(1, 2) === 3           //basic usage
  *   add2(2, -3) === -1         //can do negative numbers
  *   add2(1, 0) === add2(0, 1)  //is commutative
  *   add2(1, "2") === "12"      //can do a string concatenation
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
 * let arr = [1, 2, 3], orig = [1, 2, 3]    //define some variables in the test
 * //
 * assert.deepEqual(swapA(arr), [2, 1, 3])  //swaps first two items
 * assert.deepEqual(arr, orig)              //preserves the original array
 *
 */
const swapA = ([a, b, ...tail]) => [b, a, ...tail]

module.exports = {
    add,
    add2,
    swapA,
}
