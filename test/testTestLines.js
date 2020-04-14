
  
  false   //this should not be tested
/*-
:::  without begin-test mark
*/ //-
/*
false   //this should not be tested
    false   //this should not be tested

    ::
    false   //this should not be tested
    
::    
    false   //this should not be tested
*/

/*-
:::  empty after begin-test mark
*/ //-
/*
:::

*/

/*-
:::  empty after begin-test mark 2
*/ //-
/*
:::

 false   //this should not be tested
*/

/*-
:::  whitespaces after begin-test mark
*/ //-
/*
:::
 
    false   //this should not be tested
*/


/*-
:::  end after begin-test mark
*/ //-
/*
::: 
*/

/*-
:::  documentation * after begin-test mark
*/ //-
/*
:::   
  * false   //this should not be tested
*/

/*-
:::  line comment after begin-test mark
*/ //-
/*
:::   
  // false   //this should not be tested
*/


/*-
:::  begin-test mark tests
*/ //-
/*
:::
testTestLines.ok()
testTestLines.ok()  //should also be tested
*/

/*-
:::  begin-test mark tests indentation 
*/ //-
/*
     ::: 
    testTestLines.ok()
  testTestLines.ok()  //should also be tested
*/

/*-
:::  begin-test mark * after tests 
*/ //-
/*
    :::
    testTestLines.ok()    
    * false   //this should not be tested
    false   //this should not be tested 
*/

/*-
:::  begin-test mark whitespaces after tests 
*/ //-
/*
    :::
    testTestLines.ok() 

    false   //this should not be tested
*/

/*-
:::  uncommented code
*/ //-
false   //this should not be tested


/*-
:::  more begin-test marks in one comment
*/ //-
/*

    :::
    testTestLines.ok()
   :::
     testTestLines.ok()  
    testTestLines.ok() 

    false   //this should not be tested
    
:::
testTestLines.ok()

    false   //this should not be tested
*/

/*-
:::  begin-test mark documentation-style comment 
*/ //-
/**
 * 
 :::
 testTestLines.ok()
 * 
 false   //this should not be tested
 */

 /*-
::: begin-test mark documentation-style comment with empty line after
*/ //-
/**
 * 
 :::
 testTestLines.ok()

 *
   false   //this should not be tested
 */


/*-
:::  begin-test mark some code line-commented
*/ //-
/*
 
   :::
  testTestLines.ok()
// false   //this should not be tested
 //false   //this should not be tested
    testTestLines.ok()

 false   //this should not be tested
 * 
 */

 /*-
:::  begin-test mark commented
*/ //-
/*
 
   //:::
   false   //this should not be tested
 false   //this should not be tested

 false   //this should not be tested
 * 
 */


const getOk = () => {
    let counter = 0
    return () => {
        counter++
        console.log(`OK:   ${counter}`)
        return true
    }
}

module.exports = {
    ok: getOk(),
}
