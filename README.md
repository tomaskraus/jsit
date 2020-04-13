# jsit

- **The simplest unit-test framework ever.**
- No config, no `test_` files!
- For Node Modules.
- **Document** &amp; **test** your code at **once**.

## 1. Install jsit

``` bash
npm install --save-dev jsit
```

## 2. Write some code you want to test

We'll give the file a name: `my-math.js`. It will be our **Node module**. Let's write some code into it:

``` javascript

    module.export.add = function(a, b) {
        return a + b
    }
```

## 3. Write simple tests

Directly, in your code! Just under a `:::` mark, in the block comment. One test per line.

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
FAIL | 29 | /home/examples/my-math.js:29 | The result is false |  my_math.minus(1, -1) == 3
FAIL | 31 | /home/examples/my-math.js:31 | AssertionError [ERR_ASSERTION]: -1 === -2 |  assert.strictEqual( my_math.minus(1, 2), -2 )
FAIL | 45 | /home/examples/my-math.js:45 | The result is false |   my_math.plus(1, -1) == 2

```

## 5. Turn it into documentation

``` javascript
    /**
     * Adds number a to b
     * @example
        :::
        my_math.add(1, 2) == 3
        my_math.add(1, 0) == my_math.add(0, 1)  //commutative
     */
    module.export.add = function(a, b) {
        return a + b
    }
```

The [JSDoc](https://jsdoc.app/) tool recognizes the `@example` tag, and shows that test code in the generated documentation.  
Do we need more?
