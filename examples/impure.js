/** 
 * name clash test
 * to ensure there is no interaction between program code and the code of the tested file
 * @module impure
 */

    /**
     * 
     * 
     * @example
     *: impure.summaryOfTest(1) == "abc" 
     * 
     */
    const summaryOfTest = (x) => {
        console.log("ahoj------------------------------------")
    }

//  uncomment to introduce syntax error

module.exports = {
    summaryOfTest,
}
