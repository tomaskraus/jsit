/**
 * general, useful functions
 * 
 * @module utils 
 */

const { curry } = require('folktale/core/lambda')

//tap :: (a -> _) -> a -> a
const tap = curry(2, (fn, a) => {
    fn(a)
    return a
})

//inc :: num -> num
//::: inc
// const inc = utils.inc
// inc(1) === 2
// assert.equal(inc(-1), 0)
const inc = i => i + 1

//log2 :: str -> a -> a
const log2 = curry(2, (descr, a) => tap(s => console.log(`LOG ${descr}:`, s), a)
)

//log :: a -> a
const log = log2("")


module.exports = {

    //logging
    log, log2,

    //tap :: (a -> _) -> a -> a
    tap,
    //inc :: num -> num
    inc,
}