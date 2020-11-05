const { compose } = require('folktale/core/lambda')
const Result = require('folktale/result')
const { map, chain } = require('pointfree-fantasy')
const L = require('lenses')

const tbf = require('./text-block-filter')
const { TestBlock } = require('./TestBlock')


// lenses   for evaluation-param 
const lens = L.makeLenses(['fileName', 'vars', 'msg', 'stats', 'numFailed', 'totalTests'])
lens.stats_numFailed = compose(lens.stats, lens.numFailed)
lens.stats_totalTests = compose(lens.stats, lens.totalTests)

// context
const createContext = (fileName, originalContext) => (
    { ...originalContext, fileName, stats: { numFailed: 0, totalTests: 0 } }
)

const isLineComment = s => tbf.Regex.JSLineComment.test(s)


const TestRunnerCreator = (messager, evaluator) => {

    const testBlock = TestBlock.create(
        ctx => compose.all(
            _resetVarsHandler,
            tbf.tap(messager.describe),
        )(ctx),

        tbf.Result.Error
    )


    const executableTestLinesResulter = compose.all(
        chain(tbf.resulterFilterLine(s => !isLineComment(s))),
        testBlock.resulter,
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
    const _addVarMapper = ctx => L.over(tbf.L.line, s => `${L.view(lens.vars, ctx)} ${s}`, ctx)

    const removeLineCommentAtTheEnd = line => line.replace(/^(.*)\/\/.*$/, "$1")

    const _detectVarHandler = ctx => {
        const line = L.view(tbf.L.line, ctx)
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
        executableTestLinesResulter,
    )

    const testingReducer = tbf.reducer(testingResulter)

    return {
        reducer: testingReducer,
        flush: testBlock.flush,
        createContext: fileName => createContext(fileName, tbf.contextCreate()),
    }

}

//-------------------------------------------------------------------------------------


module.exports = {
    TestRunner: {
        create: TestRunnerCreator,       
    }
}