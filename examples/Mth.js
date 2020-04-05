/** 
 * Provides basic arithmetical ops
 * @module Mth
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
     *: Mth.minus(1, 1) == 0 
     *: Mth.minus(1, -1) == 2
     *: Mth.minus(1, 2) == -1 
     * 
     */
    const minus = (a, b) => {
        return a - b
    }

    /** add number a to number b
     * @example
     *: Mth.plus(1, 1) =w= 2 
     *: Mth.plus(1, -1) == 2 
     *: Mth.plus(1, 2) == 3 
     */
    const plus = (a, b) => {
        return a + b
    }



module.exports = {
    plus,
    minus,
}
