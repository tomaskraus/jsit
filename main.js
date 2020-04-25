/* Main routine */

const { compose, curry } = require('folktale/core/lambda')
const Result = require('folktale/result')
const { map, chain } = require('pointfree-fantasy')
const lp = require("./lineProc")
const ep = require("./evalProc")
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
    return `END | Failures | ${L.view(ep.lens.stats_numFailed, ctx)} | Tests | ${L.view(ep.lens.stats_totalTests, ctx)}`
}

impure.createEvalObj = (pathForModuleRequire) => {
    const nameWithoutExt = (pathName) => path.basename(pathName, path.extname(pathName))
    const moduleName = nameWithoutExt(pathForModuleRequire)
    const sanitizeName = moduleName => moduleName.replace('-', '_')
    const requireFileStr = `var ${sanitizeName(moduleName)} = require("${fileName}")`
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

impure.app = (filename, evalHandlerObj) => {
    try {
        impure.context.fileName = fileName
        // lp.log(impure.context)

        const testHandlerObj = ep.factory.createTestLineObj({
            onTest: ep.factory.createTestHandler(evalHandlerObj),
            onEnd: ctx => console.log(impure.summaryOfTest(ctx)),
        })
        // const testHandler = ep.factory.createTestLineFilter({ onTest: ctx => Result.Ok(lp.tapCtx(lp.lens.input, console.log, ctx)) })
        // const testHandler = ep.factory.createTestLineFilter({onTestRelated: ctx => Result.Ok(lp.tapCtx(lp.lens.output, console.log, ctx))})

        const process = lp.factory.createProcessLine(testHandlerObj.filter)

        const rs = fs.createReadStream(filename)
        rs.on('error', err => impure.errAndExit(err.message))

        const readline = require('readline');
        const rl = readline.createInterface({
            input: rs,
            output: process.stdout,
            terminal: false,
        });

        rl.on('line', (line) => { impure.context = process(line, impure.context) })
        rl.on('close', () => testHandlerObj.flush(impure.context))

    } catch (e) {
        impure.errAndExit(e)
    }
}



// ---------------------------------------------------------------------------------------------------------


//impure code, that has to be done in global scope: --------------------------------------------------------

const path = require('path')
const fileName = path.resolve(process.argv[2])
    .replace(/\\/g, "/")    //on Windows

//check if file exists
try {
    fs.accessSync(fileName, fs.constants.R_OK);
    const evaluatorObj = impure.createEvalObj(fileName)

    if (!impure.error) {
        impure.context = ep.factory.createContext()
        impure.app(fileName, evaluatorObj)

    }
} catch (err) {
    impure.errAndExit(err.message)
}

//----------------------------------------------------------------------------------------------


