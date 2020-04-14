# jsit

- **The simplest unit-test framework ever.**
- No config, no `test_` files!
- **Document** &amp; **test** your code at **once**.
- For Node Modules.

## 1. Install jsit

``` bash
npm install --save-dev jsit
```

## 2. Write some code

We'll give the file a name: `my-math.js`. It will be our **Node module**. Let's write some code into it:

``` javascript

    module.export.add = function(a, b) {
        return a + b
    }
```

## 3. Write tests

Directly, in your code! Just under a `:::` mark, in the block comment. One test per line. Just a `true`/`false` expressions.

``` javascript
    /*
        :::
        my_math.add(1, 2) == 3
        my_math.add(1, 0) == my_math.add(0, 1)  //commutative
    */
    module.export.add = function(a, b) {
        return a + b
    }
```

Because we are testing within a module, use a module name as an `object` that contains our tested function.

**Note:** If your module name contains a `-` character (`my-math`), replace that `-` with an underscore: `_`, in the code (`my_math`). 

These tests are valid javascript expressions.

**Hint:** Write these test uncommented, let the IDE do a syntax-check, then comment them.

## 4. Run tests

At your command prompt, type:

``` bash
node jsit.js ./examples/my-math.js
```

...and the result is something like:

``` bash
BEGIN | Module | my-math | File | /home/examples/my-math.js

```

## 5. Turn it into documentation

``` javascript
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
```

The [JSDoc](https://jsdoc.app/) tool recognizes the `@example` tag, and shows that test code in the generated documentation.  
Do we need more?

## 6. More...

### Need an assertion?

More real-life example:

``` javascript
/**
 * @module my_math
 */

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
    swapA,
}
```

Yes, we can use the full power of built-in Node `assert` library. By default.
