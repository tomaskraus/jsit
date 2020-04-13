/**
 * @module my_math
 */


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

module.exports = {
    add
}
