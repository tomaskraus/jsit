
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
 
//----------------------------------------------------------------------------------


// ::: block withhout commented code below
false   //this should not be tested
 
//--------------BLOCK COMMENTS------------------------------------------------------


  false   //this should not be tested

/*-
::: test block behavior
*/ //-
/* 
::: empty block

false   //this should not be tested

:::without a label

:::
testTestLines.ok()

::: block with one test
testTestLines.ok()

false   //this should not be tested

::: block with two or more tests
testTestLines.ok()
testTestLines.ok()


::: block with lineCommented lines 1
//

::: block with lineCommented lines 2
// false   //this should not be tested

false   //this should not be tested

::: block with lineCommented lines 3
// false   //this should not be tested
testTestLines.ok()
// false   //this should not be tested
testTestLines.ok()

::: block with lineCommented lines 4
//
testTestLines.ok()
testTestLines.ok()
//
testTestLines.ok()

false   //this should not be tested
 */

/*-
::: begin-mark - indentation
*/ //-

/*
::: no indent
testTestLines.ok()

:::text right after the mark
testTestLines.ok()

 ::: one whitespace before and after
testTestLines.ok()

    :::  many whitespaces before and after
testTestLines.ok()
*/

/*-
:::  begin-test mark - surrounded lines
*/ //-
/*
::: at the beginning of comment block
testTestLines.ok()

false   //this should not be tested

someting
::: after some not-empty line
testTestLines.ok()

::: empty line after

false   //this should not be tested

::: whitechars line after
  
false   //this should not be tested

::: two begin marks adjacent lines
::: 
testTestLines.ok()

false   //this should not be tested

::: test block
testTestLines.ok()
::: adjacent test block
testTestLines.ok()

*/

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
:::  begin-test mark commented
*/ //-
/*
 
   //:::
   false   //this should not be tested
 false   //this should not be tested

 false   //this should not be tested
 ::: other, not commented
  testTestLines.ok()
 * 
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
:::  begin-test mark - separate blocks are independent
*/ //-

/* 
  ::: 1st block
   testTestLines.ok()
 */
/* 
  false  //this should not be tested. It is different block, with no test block
 */


/*-
:::  begin-test mark - documenting block
*/ //-

/** 
  ::: inside minimal documenting block
   testTestLines.ok()
  */

/** 
 * 
  ::: inside documenting block
   testTestLines.ok()
 * 
 */


//:::---------LINE COMMENTS-----------------------------------------------------------------

// ::: test block behavior
 
 
// ::: empty block

// false   //this should not be tested

// :::without a label

// :::
// testTestLines.ok()

// ::: block with one test
// testTestLines.ok()

// false   //this should not be tested

// ::: block with two or more tests
// testTestLines.ok()
// testTestLines.ok()


// ::: block with lineCommented lines 1
// //

// ::: block with lineCommented lines 2
// // false   //this should not be tested

// false   //this should not be tested

// ::: block with lineCommented lines 3
// // false   //this should not be tested
// testTestLines.ok()
// // false   //this should not be tested
// testTestLines.ok()

// ::: block with lineCommented lines 4
// //
// testTestLines.ok()
// testTestLines.ok()
// //
// testTestLines.ok()

// false   //this should not be tested
  

 
// ::: begin-mark - indentation
 

 
// ::: no indent
// testTestLines.ok()

// :::text right after the mark
// testTestLines.ok()

//  ::: one whitespace before and after
// testTestLines.ok()

//     :::  many whitespaces before and after
// testTestLines.ok()
 

 
// :::  begin-test mark - surrounded lines
 
 
// ::: at the beginning of comment block
// testTestLines.ok()

// false   //this should not be tested

// someting
// ::: after some not-empty line
// testTestLines.ok()

// ::: empty line after

// false   //this should not be tested

// ::: whitechars line after
  
// false   //this should not be tested

// ::: two begin marks adjacent lines
// ::: 
// testTestLines.ok()

// false   //this should not be tested

// ::: test block
// testTestLines.ok()
// ::: adjacent test block
// testTestLines.ok()

 

   
// :::  without begin-test mark
 
 
// false   //this should not be tested
//     false   //this should not be tested

//     ::
//     false   //this should not be tested
    
// ::    
//     false   //this should not be tested
 

  
// :::  begin-test mark commented
 
 
 
//    //:::
//    false   //this should not be tested
//  false   //this should not be tested

//  false   //this should not be tested
//  ::: other, not commented
//   testTestLines.ok()
//  * 
  


 
// :::  end after begin-test mark
 
 
// ::: 
 

 
// :::  documentation * after begin-test mark
 
 
// :::   
//   * false   //this should not be tested
 

  
// :::  begin-test mark - separate blocks are independent
 

 
//   ::: 1st block
//    testTestLines.ok()
  
 
//   false  //this should not be tested. It is different block, with no test block
  

//:::- - - - - - - - - MIXED COMMENTS - - - - - - - - - - - - - - - - - - - - - -


/* 
// ::: line comment test inside block comment
// false  //this should not be tested.

// false  //this should not be tested.


false  //this should not be tested.

 */

