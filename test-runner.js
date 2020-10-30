const { compose } = require('folktale/core/lambda')
const { map, chain } = require('pointfree-fantasy')

const tbf = require('./text-block-filter')



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
        createContext: tbf.contextCreate,
    }

}

//-------------------------------------------------------------------------------------


module.exports = {
    createRunner: TestRunner,
}