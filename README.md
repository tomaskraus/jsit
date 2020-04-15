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

We'll give the file a name: `myMath.js`

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
        myMath.add(1, 2) == 3
        myMath.add(1, 0) == myMath.add(0, 1)  //commutative
    */
    module.export.add = function(a, b) {
        return a + b
    }
```

Use a module name as an `object` that contains our tested function. (`add` becomes `myMath.add`)

These tests are valid javascript expressions.

**Hint:** Write these test uncommented, let the IDE do a syntax-check, then comment them.

## 4. Run tests

``` bash
node jsit.js ./examples/myMath.js
```

...and the result is something like:

``` bash
BEGIN | Module | myMath | File | /home/examples/myMath.js

```

## 5. Turn it into documentation

``` javascript
/**
 * @module myMath
 */

/**
  * Adds number a to b
  * @example
     :::
     myMath.add(1, 2) == 3
     myMath.add(1, 0) == myMath.add(0, 1)  //commutative
     myMath.add(1, "2") === "12"
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

## More...

### Need an assertion?

More real-life example:

``` javascript
/**
 * @module myMath
 */

/**
 * Swaps first two items in array. Returns a new array, the input array remains untouched.
 *
 * swapA :: [a] -> [a]
 *
 * @example
 :::
 var a = [1, 2, 3]; assert.deepEqual(myMath.swapA(a), [2, 1, 3]); assert.deepEqual(a, [1, 2, 3])
 *
 */
const swapA = ([a, b, ...tail]) => [b, a, ...tail]

module.exports = {
    swapA,
}
```

Yes, we can use the full power of built-in Node `assert` library. By default.


## Not so obvious

#### module names
If your module name contains a `-` character (e.g. `my-first-module`), replace that `-` with an underscore: `_`, in the code (`my_first_module`) in your tests: 

##TODO: how jsit names an imported module using its file name

file `my-first-module.js`:
``` javascript
    // :::
    // my_first_module.add(1, 2) == 3
    // my_first_module.add(1, 0) == my_first_module.add(0, 1)  //commutative
    module.export.inc = (x) => {
        return x + 1
    }
```