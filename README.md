# jsit

- **The simplest unit-testing tool ever.**
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
function add(a, b) {
  return a + b
}
```

## 3. Write tests

Directly, in your code! Just below a `//:::` mark, in the comment. One test per line. Just a valid js `true`/`false` expressions.

``` javascript
//::: our tests for the "add" function
// add(1, 2)    === 3
// add(1, 0)    === add(0, 1)   //is commutative
// add(1, "2")  === "12"        //can do a string concatenation
function add(a, b) {
  return a + b
}

module.exports = {
  add,              //only exported fields can be tested
}
```

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

We can also add our tests to the block comments. That gives a chance to various documentation generators (such as [JSDoc][1]) to deal with these tests.

``` javascript
/**
 * @module my_math
 */

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
function add(a, b) {
  return a + b
}

module.exports = {
  add,              //only exported fields can be tested
}
```

For example, the [JSDoc][1] tool recognizes the `@example` tag, and shows that test code in the generated documentation.  

**Note**: We still use a `//:::` string to mark a test beginning. Because it is a proper line-comment, it forms a valid javascript code.

## More

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
 * let arr = [1, 2, 3], orig = [1, 2, 3]    //define some variables in the test
 * //
 * assert.deepEqual(swapA(arr), [2, 1, 3])  //swaps first two items
 * assert.deepEqual(arr, orig)              //preserves the original array
 *
 */
const swapA = ([a, b, ...tail]) => [b, a, ...tail]

module.exports = {
  swapA,              //only exported fields can be tested
}
```

Yes, we can use the full power of built-in Node `assert` library. By default.



## Links

[1]: https://jsdoc.app/ (JSDoc)

[2]: https://rbcs-us.com/documents/Why-Most-Unit-Testing-is-Waste.pdf (Why Most Unit Testing is Waste)

