/** 
 * Provides basic arithmetical ops
 * @module Mth
 */

//
//:::jsit 1


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
     *: assert.strictEqual( Mth.minus(1, 2), -3 )
     *: Mth.b = 0;     true
     *: Mth.minus(1, Mth.b) == 1
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



//----- alternative syntax --------------------------------------

/** 
:::
let Mth = {}
Mth.a = [1,2,3]
test.equals( Mth.a, [1, 2, 3] )
test.throws( () => Mth.plus(-1, 1), Error)
console.log( ,  )
 */


//test.of( Mth.plus(-1, 1) ).equals( 2 ) 
//test.of( () => Mth.plus(-1, "a") ).throws( Error ).property("message").contains("syntax err")

/**
 * 
 * :::
 * Mth.a = [1,2,3]
 * Mth = "aabbcc"
 * console.log(Mth.a.toString())
 */

let hello = "hello"


//     
// ::: 
// let Mth = {}
// Mth.a = [1,2,3]
// //Mth = "aabbcc"
// console.log(Mth.a.toString())
// 



/**
 *: Mth.a = false;      Mth
 *: Mth.a === false 
 *: Mth.a === 2 
 *: //Mth = "abc"
 *: //Mth = "ahhoj"
 */

//-------------------------------------------------------------------

/**
 *: Mth.a = [1,2,3]
 *: Mth.a.toString() === "1,2,3" 
 *: assert.deepStrictEqual( Mth.a, [1,2,4] )
 *: assert.deepStrictEqual( Mth.a, [1,2,3] )
 *: console.log(Mth.a.concat([5]).toString())
 *: a = 22 
 */


     /**
     *: M = {} 
     *: M.a = [1,2,4]
     */
    
    /**
     *: M.a.toString() === "1,2,4" 
     *: M.a.concat([3]) == '1,2,4,3'
     *: a = 22 
     */

/**
 *: Mth.obj1 = { a: 1, b: "22" }
 *: Mth.obj2 = { a: 1, b: "22" }
 *: Mth.obj1 == Mth.obj2
 *: throw new Error("HU!") 
 *: ({}) instanceof Object 

 */

module.exports = {
    plus,
    minus,
}
