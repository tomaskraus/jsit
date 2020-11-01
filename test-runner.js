const { compose } = require('folktale/core/lambda')
const Result = require('folktale/result')
const { map, chain } = require('pointfree-fantasy')
const L = require('lenses')

const tbf = require('./text-block-filter')


// lenses   for evaluation-param 
const lens = L.makeLenses(['vars', 'stats', 'numFailed', 'totalTests'])
lens.stats_numFailed = compose(lens.stats, lens.numFailed)
lens.stats_totalTests = compose(lens.stats, lens.totalTests)

// context
const createContext = originalContext => (
    { ...originalContext, stats: { numFailed: 0, totalTests: 0 } }
)

const trimStr = s => s.trim()
const isLineComment = s => tbf.Regex.JSLineComment.test(s)


const removeLineComment = line => line.replace(/^(\/\/)(.*)$/, "$2")
const repairTestHeader = line => line.replace(/^:::(.*)$/, "//:::$1")
const lineCommentResulter = compose.all(
    map(tbf.contextOverLine(
        compose.all(
            repairTestHeader, //restore the test header we've stripped earlier
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
            if (evaluator.evaluate(ctx.line)) {
                messager.testOk(ctx)
                return ctx
            } else {
                messager.testFailure(ctx)
                return ctx
            }
        } catch (e) {
            messager.testFailure(ctx)
            return ctx
        }
    }

    const testingContextResulter = ctx => {
        // TODO: implement test context logic here 
        return Result.Ok(ctx)
    }

    const testingResulter = compose.all(
        map(evaluate),
        chain(testingContextResulter),
        allTestLinesResulter,
    )

    const testingReducer = tbf.reducer(testingResulter)

    return {
        reducer: testingReducer,
        flush: testBlockParser.contextFlush,
        createContext: () => createContext(tbf.contextCreate()),
    }

}

//-------------------------------------------------------------------------------------


module.exports = {
    createRunner: TestRunner,
}