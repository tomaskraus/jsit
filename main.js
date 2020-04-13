/* Main routine */

const { compose, curry } = require('folktale/core/lambda')
const Result = require('folktale/result')
const { map } = require('pointfree-fantasy')
const lp = require("./lineProcessor")
const L = require('lenses')

//place all impure functions under this
const impure = { error: false }

impure.errAndExit = msg => {
    impure.error = true
    console.error(msg)
    // process.exit(1)
    process.exitCode = 1    //soft exit, allowing things to close itself properly
}

impure.summaryOfTest = (ctx) => {
    return () => {
        return `END | Failures | ${ctx.stats.failCount} | Tests | ${ctx.stats.totalCount}`
    }
}

impure.createEvalObj = (pathForModuleRequire) => {
    const nameWithoutExt = (pathName) => path.basename(pathName, path.extname(pathName))
    const moduleName = nameWithoutExt(pathForModuleRequire)
    const requireFileStr = `var ${moduleName} = require("${fileName}")`
    console.log(`BEGIN | Module | ${moduleName} | File | ${fileName}`)

    const outerImpure = impure
    try {
        eval(requireFileStr)
        eval("var assert = require('assert')")
        return { eval: str => eval(str) }
    } catch (e) {
        outerImpure.errAndExit(e)
        return { eval: null }
    }
}


const fs = require('fs');

impure.app = (filename, evalHandlerObj, endCallback, context) => {
    try {
        impure.context.fileName = fileName
        // lp.log(impure.context)

        testHandler = impure.createTestHandler(evalHandlerObj)

        const rs = fs.createReadStream(filename)
        rs.on('error', err => impure.errAndExit(err.message))

        const readline = require('readline');
        const rl = readline.createInterface({
            input: rs,
            output: process.stdout,
            terminal: false,
        });
        rl.on('line', (line) => { impure.context = lp.processLine(testHandler, line, impure.context) })
        // rl.on('close', endCallback)

    } catch (e) {
        impure.errAndExit(e)
    }
}


const logFailMessage = (ctx, msg) => `FAIL | ${ctx.lineNum} | ${ctx.fileName}:${ctx.lineNum} | ${msg} | ${ctx.output}`

// ctx -> Result ctx
impure.createTestHandler = evaluatorObj => ctx => {
    // lp.log2("eh", ctx)
    // return lp.handlers.extractTestLine(ctx)
    return lp.handlers.extractTestLineInBlock(ctx)
        .chain(ctx => {
            // lp.log2("line", ctx)
            try {
                // ctx.stats.totalCount++
                const testPassed = evaluatorObj.eval(L.view(lp.ctxL.output, ctx))
                if (!testPassed) {
                    console.log(logFailMessage(ctx, "The result is false"))
                    // ctx.stats.failCount++
                    return Result.Error(ctx)
                }
                return Result.Ok(ctx)
            } catch (e) {
                // ctx.stats.failCount++
                console.log(logFailMessage(ctx, e))
                return Result.Error(ctx)
            }

        })
}



// ---------------------------------------------------------------------------------------------------------

//maybe will not work in callback if context variable pointer changes
const onAppEnd = (ctx) => () => {
    console.log(impure.summaryOfTest(ctx)())
}

//impure code, that has to be done in global scope: --------------------------------------------------------

const path = require('path')
const fileName = path.resolve(process.argv[2])
    .replace(/\\/g, "/")    //on Windows

//check if file exists
try {
    fs.accessSync(fileName, fs.constants.R_OK);
    const evaluatorObj = impure.createEvalObj(fileName)

    if (!impure.error) {
        impure.context = lp.createContext()
        //will not work, as initial context will remain the same
        impure.app(fileName, evaluatorObj, onAppEnd(impure.context), impure.context)

    }
} catch (err) {
    impure.errAndExit(err.message)
}

//----------------------------------------------------------------------------------------------


