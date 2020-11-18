////+ module
/**
 * @module my_math
 */
////-

////+ add-test-simple
//::: our tests for the "add" function
// add(1, 2)    === 3
// add(1, 0)    === add(0, 1)   //is commutative
// add(1, "2")  === "12"        //can do a string concatenation
////-
////+ add-test
/**
  * Adds number a to b
  * 
  * @example
  *   //::: add
  *   add(1, 2)   === 3           //basic usage
  *   add(2, -3)  === -1          //can do negative numbers
  *   add(1, 0)   === add(0, 1)   //is commutative
  *   add(1, "2") === "12"        //can do a string concatenation
  */
////-
////+ add
function add(a, b) {
  return a + b
}
////-

////+ swapA
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
////-

////+ exports-swapA
module.exports = {
  swapA,              //only exported fields can be tested
}
////-

////+ exports-add
module.exports = {
  add,              //only exported fields can be tested
}
////-

////+ exports-all
module.exports = {
  add,
  swapA,
}
////-
