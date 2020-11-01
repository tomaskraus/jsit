const { compose } = require('folktale/core/lambda')
const Result = require('folktale/result')
const { map, chain } = require('pointfree-fantasy')
const L = require('lenses')

const tbf = require('./text-block-filter')


// lenses   for evaluation-param 
const lens = L.makeLenses(['fileName', 'vars', 'msg', 'stats', 'numFailed', 'totalTests'])
lens.stats_numFailed = compose(lens.stats, lens.numFailed)
lens.stats_totalTests = compose(lens.stats, lens.totalTests)

// context
const createContext = (fileName, originalContext) => (
    { ...originalContext, fileName, stats: { numFailed: 0, totalTests: 0 } }
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
            ctx => compose.all(
                _resetVarsHandler,
                tbf.tap(messager.describe),
            )(ctx),
            
            tbf.Result.Error,
        ),
        'tBlock'
    )

    const executableTestLineResulter = compose.all(
        chain(tbf.resulterFilterLine(s => !isLineComment(s))),
        testBlockParser.resulterFilter,
    )

    const allTestLinesResulter = compose.all(
        chain(executableTestLineResulter),
        result => result.orElse(
            lineCommentResulter
        ),
        blockCommentResulter,
        tbf.contextOverLine(trimStr),
    )

    const inc = x => x + 1

    const evaluate = () => {
        const resultAddFail = (ctx, err) => compose.all(
            tbf.tap(messager.testFailure),
            L.set(lens.msg, err.message),
            L.over(lens.stats_numFailed, inc),
        )(ctx)
        return ctx => {
            const ctx2 = L.over(lens.stats_totalTests, inc, ctx)
            try {
                const testResult = evaluator.evaluate(ctx2.line)
                if (testResult !== false) {     //written this way because of "assert" method, which returns "undefined" if the assertion is met
                    messager.testOk(ctx2)
                    return ctx2
                } else {
                    return resultAddFail(ctx2, new Error(`should be [true], but is [${testResult}]`))
                }
            } catch (e) {
                return resultAddFail(ctx2, e)
            }
        }
    }

    //---------------------------------------------------------------------------------------------------


    const varRegex = /^\s*(const|let|var)\s+/s
    const _resetVarsHandler = ctx => Result.Error(L.set(lens.vars, '', ctx))
    const _addVarMapper = ctx => L.over(tbf.CLens.line, s => `${L.view(lens.vars, ctx)} ${s}`, ctx)

    const removeLineCommentAtTheEnd = line => line.replace(/^(.*)\/\/.*$/, "$1")

    const _detectVarHandler = ctx => {
        const line = L.view(tbf.CLens.line, ctx)
        if (varRegex.test(line)) {
            const s_line = removeLineCommentAtTheEnd(line).trim()
            return Result.Error(L.over(lens.vars, s => `${s}${s_line}; `, ctx))
        }
        return Result.Ok(ctx)
    }
    
    

    const testingContextResulter = ctx => compose.all(
        map(_addVarMapper),
        _detectVarHandler,
    )(ctx)

    //---------------------------------------------------------------------------------------------------

    const testingResulter = compose.all(
        map(evaluate()),
        chain(testingContextResulter),
        allTestLinesResulter,
    )

    const testingReducer = tbf.reducer(testingResulter)

    return {
        reducer: testingReducer,
        flush: testBlockParser.contextFlush,
        createContext: fileName => createContext(fileName, tbf.contextCreate()),
    }

}

//-------------------------------------------------------------------------------------


module.exports = {
    createRunner: TestRunner,
}