# jsit

- **The simplest unit-test framework ever.**
- No config, no `test*` files!
- **Document** &amp; **test** your code at **once**.
- For Node Modules.

## 1. Install jsit

``` bash
npm install --save-dev jsit
```

## 2. Write some code

We'll give the file a name: `MyMath.js`

``` javascript

    add = function(a, b) {
        return a + b
    }
```

## 3. Write tests

Directly, in your code! Just below a `//:::` mark, in the comment. One test per line. Just a valid js `true`/`false` expressions.

``` javascript
//::: our tests for the "add" function
// add(1, 2) === 3
// add(1, 0) === add(0, 1)  //is commutative
// add(1, "2") === "12"     //can do a string concatenation
const add = function (a, b) {
    return a + b
}

module.exports = {
    add,              //only exported fields can be tested
}
```

Magic: we don't need to prefix our functions with module name in our tests. No `MyMath.add`, just `add`.

**Note:** Only exported fields can be tested.

**Hint:** Write these test uncommented, let the IDE do a syntax-check, then comment them.

## 4. Run tests

``` bash
node jsit.js ./examples/MyMath.js
```

...and the test output is something like:

``` bash
START | file: [./examples/MyMath.js] , module: [MyMath]
//::: our tests for the "add" function
OK | ' add(1, 2) === 3'
OK | '//is commutative'
OK | '//can do a string concatenation'
END | failed tests: [0] | total tests: [3]
```

Some interesting things in `MyMath.js` test source affects the test output:

- a string written after the `//:::` test header, is shown in the test output
- if there is a line comment at the end of the test line, only that comment will be shown for that line in the test output



## 5. Turn it into documentation

``` javascript
/**
 * @module MyMath
 */

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

  module.exports = {
    add2,
}
```

The [JSDoc](https://jsdoc.app/) tool recognizes the `@example` tag, and shows that test code in the generated documentation.  
Do we need more?

## More...

### Need an assertion?

More real-life (still silly) example:

``` javascript
/**
 * Swaps first two items in array. Returns a new array, the input array remains untouched.
 *
 * swapA :: [a] -> [a]
 *
 * @example
 * //::: swapA
 * let a = [1, 2, 3], orig = [1, 2, 3]   //define some variables in the test
 * let swapped = [2, 1, 3]
 * assert.deepEqual(swapA(a), swapped)
 * assert.deepEqual(a, orig)             //preserves the original array
 *
 */
const swapA = ([a, b, ...tail]) => [b, a, ...tail]

module.exports = {
    swapA,
}
```

Yes, we can use the full power of built-in Node `assert` library. By default.
