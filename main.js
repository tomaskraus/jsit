/* Main routine */

const core = require('./core')

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
        console.log(`END | Failures | ${ctx.stats.failCount} | Tests | ${ctx.stats.totalCount}`)
    }
}

impure.sandbox = (pathForModuleRequire) => {
    const nameWithoutExt = (pathName) => path.basename(pathName, path.extname(pathName))
    const moduleName = nameWithoutExt(pathForModuleRequire)
    const requireFileStr = `var ${moduleName} = require("${fileName}")`
    console.log(`BEGIN | Module | ${moduleName} | File | ${fileName}`)

    const outerImpure = impure
    try {
        eval(requireFileStr)
        return { eval: str => eval(str) }
    } catch (e) {
        outerImpure.errAndExit(e)
        return { eval: null }
    }
}


const fs = require('fs');

impure.app = (filename, evaluationCallback, context) => {
    try {
        context.fileName = fileName
        const rs = fs.createReadStream(filename)
        rs.on('error', err => impure.errAndExit(err.message))

        const readline = require('readline');
        const rl = readline.createInterface({
            input: rs,
            output: process.stdout,
            terminal: false,
        });
        rl.on('line', (line) => core.impure.processLine(evaluationCallback, line, context))
        rl.on('close', impure.summaryOfTest(context))

    } catch (e) {
        impure.errAndExit(e)
    }
}

// ---------------------------------------------------------------------------------------------------------

const comment = str => `// ${str}`

//impure code, that has to be done in global scope: --------------------------------------------------------

const path = require('path')
const fileName = path.resolve(process.argv[2])
    .replace(/\\/g, "/")    //on Windows

//check if file exists
try {
    fs.accessSync(fileName, fs.constants.R_OK);
    const sandB = impure.sandbox(fileName)
    if (!impure.error) {
        impure.app(fileName, sandB.eval, core.context)
    }
} catch (err) {
    impure.errAndExit(err.message)
}

//----------------------------------------------------------------------------------------------


