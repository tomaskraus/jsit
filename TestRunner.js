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



const createTestRunner = (messager, evaluator) => {

    const testBlock = TestBlock.create(
        ctx => compose.all(
            Result.Error,
            tbf.tap(messager.describe),
            clearVars,
        )(ctx),

        tbf.Result.Error
    )


    const isLineComment = s => tbf.Regex.JSLineComment.test(s)
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

    //---create variables in test------------------------------------------------------------------------------------------------


    const varRegex = /^\s*(const|let|var)\s+/s
    const clearVars = ctx => L.set(lens.vars, '', ctx)
    const removeLineCommentAtTheEnd = line => line.replace(/^(.*)\/\/.*$/, "$1")

    const addVarsToStartOfTheLine = ctx => L.over(tbf.L.line, line => `${L.view(lens.vars, ctx)} ${line}`, ctx)


    const detectVars = ctx => {
        const line = L.view(tbf.L.line, ctx)
        if (varRegex.test(line)) {
            const newVarsToAdd = removeLineCommentAtTheEnd(line).trim()
            return Result.Error(L.over(lens.vars, varLine => `${varLine}${newVarsToAdd}; `, ctx))
        }
        return Result.Ok(ctx)
    }


    const varResulter = ctx => compose.all(
        map(addVarsToStartOfTheLine),
        detectVars,
    )(ctx)

    //---------------------------------------------------------------------------------------------------

    const testingResulter = compose.all(
        map(evaluate()),
        chain(varResulter),
        executableTestLinesResulter,
    )


    return {
        reducer: tbf.reducer(testingResulter),
        flush: testBlock.flush,
        createContext: fileName => createContext(fileName, tbf.contextCreate()),
    }

}

//-------------------------------------------------------------------------------------


module.exports = {
    TestRunner: {
        create: createTestRunner,
    }
}