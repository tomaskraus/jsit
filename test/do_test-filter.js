const { compose } = require('folktale/core/lambda')
const { map, chain } = require('pointfree-fantasy')

const Rx = require('rxjs')
const RxOp = require('rxjs/operators')

const tbf = require('../text-block-filter')
_Msg = require('../messagers/default')


const DATA_LINE_START = 7
const strs = `
abc
/** 
 * Provides basic arithmetical ops
 * @module Mth
 */

aaaa
// const assert = require('assert')
 

//
//:::jsit 1


  /*
 :::    
//1 === 3
  */
// hello

    /** 
     * subtracts number a from number b
     * 
     * @param {number} a first number
     * @param {number} b second number
     * @return {number} subtraction of two numbers a, b
     * 
     * 
     * @example
     *   //:::
     *   Mth.minus(1, 1) == 0
     *   Mth.minus(1, -1) == 3
     *   //Mth.minus(1, 2) == -1
        assert.strictEqual( Mth.minus(1, 2), -2 )
        const b = 0
        Mth.minus(1, b) == 1 
    */
const minus = (a, b) => {
    return a - b
}

/** add number a to number b
 * @example
  //:::
  //Mth.plus(1, 1) =w= 2 
  Mth.plus(1, -1) == 2 

  Mth.plus(1, 2) == 3 

    // //::: Minus in block comment  
// Mth.minus(10, 2) == 7
    // assert.strictEqual( Mth.minus(10, 20), -1 )

 */
const plus = (a, b) => {
    return a + b
}

/*
k1*/ x

 /*
 k2 
  */

//::: Mth.minus
// //Mth.minus(10, 2) == 7
////Mth.minus(0, 0) == 0
//  assert.strictEqual( Mth.minus(10, 20), -1 )


//:::
//hello

module.exports = {
    plus,
    minus,
}

/**
 * 
 * //:::last test
 * 1 == 1
 */

//::: last 2
// 2 == 1 + 1
`




const trimStr = s => s.trim()
const isLineComment = s => tbf.Regex.JSLineComment.test(s)


const removeLineComment = line => line.replace(/^(\/\/)(.*)$/, "$2")
const repairTestHeader = line => line.replace(/^:::(.*)$/, "//:::$1")
const lineCommentResulter = compose.all(
    map(tbf.contextOverLine(
        compose.all(
            repairTestHeader,
            trimStr,
            removeLineComment
        )
    )),
    tbf.resulterFilterLine(isLineComment),
)


const commentBlockParser = tbf.BlockParser.create(
    tbf.blockBoundaryCreate(tbf.Regex.JSBlockCommentBegin, tbf.Regex.JSBlockCommentEnd),
    tbf.blockCallbacksCreate(
        ctx => tbf.Result.Error(ctx),
        ctx => tbf.Result.Error(ctx)
    ),
    'cBlock'
)

const removeBlockCommentStar = line => line.replace(/(\s)*\*(.*)$/, "$1$2")
const blockCommentResulter = compose.all(
    map(tbf.contextOverLine(
        compose(
            trimStr,
            removeBlockCommentStar
        )
    )),
    commentBlockParser.resulterFilter,
)


const TestRunner = (messager, evaluator) => {

    const testBlockParser = tbf.BlockParser.create(
        tbf.blockBoundaryCreate(/^\/\/:::/, tbf.Regex.blankLine),
        tbf.blockCallbacksCreate(
            ctx => tbf.Result.Error(tbf.tap(messager.describe, ctx)),
            tbf.Result.Error,
        ),
        'tBlock'
    )

    const testLineResulter = compose.all(
        chain(tbf.resulterFilterLine(s => !isLineComment(s))),
        testBlockParser.resulterFilter,
    )

    const allTestLinesResulter = compose.all(
        chain(testLineResulter),
        result => result.orElse(
            lineCommentResulter
        ),
        blockCommentResulter,
        tbf.contextOverLine(trimStr),
    )

    const evaluate = ctx => {
        try {
            if (evaluator(ctx.line)) {
                messager.testOk(ctx)
                return ctx
            } else {
                messager.testFailure(ctx)
                return ctx
            }
        } catch (e) {
            messager.error(ctx)
            return ctx
        }
    }

    const testingResulter = compose.all(
        map(evaluate),
        allTestLinesResulter,
    )

    const testingReducer = tbf.reducer(testingResulter)

    return {
        reducer: testingReducer,
        flush: testBlockParser.contextFlush,
    }

}

//-------------------------------------------------------------------------------------


const testEvaluator = s => true
const runner = TestRunner(_Msg, testEvaluator)


const dataSource = Rx.from(strs.split('\n'))

const subs = dataSource
    .pipe(
        RxOp.scan(runner.reducer, tbf.contextCreate()),
        RxOp.last()
    )
    .subscribe({
        next: res => {
            _Msg.summary(
                runner.flush(res)
            )
        },
        complete: res => console.log(`END`)
    })


