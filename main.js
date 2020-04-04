/* Main routine */

const core = require('./core')

const comment = str => `// ${str}`

//place all impure functions under this
const impure = {}

impure.errAndExit = msg => {
    console.error(msg)
    // process.exit(1)
    process.exitCode = 1    //soft exit, allowing things to close itself properly
}

impure.summaryOfTest = (ctx) => {
    return () => {
        console.log(`END | Failures | ${ctx.stats.failCount} | Tests | ${ctx.stats.totalCount}`)
    }
}

impure.testLine = (line, ctx) => {
    try {
        if (line.trim() !== "") {

            result = eval(line)
            ctx.stats.totalCount++
            if (result == false) {
                ctx.stats.failCount++
                console.log(`FAIL | Line | ${ctx.lineNumber} | Is | ${result} | Should be | - | File | ${ctx.fileName} | Text | ${ctx.lineText}`)
            }
        }
    } catch (e) {
        console.error(`ERROR | Line | ${ctx.lineNumber} | File | ${ctx.fileName} | Exception | ${e} | Text | ${ctx.lineText}`)
    }
}

impure.app = (filename, context) => {
    try {
        context.fileName = fileName

        const fs = require('fs');
        const rs = fs.createReadStream(filename)
        rs.on('error', err => impure.errAndExit(err.message))

        const readline = require('readline');
        const rl = readline.createInterface({
            input: rs,
            output: process.stdout,
            terminal: false,
        });
        rl.on('line', (line) => {
            let processedLine = core.preprocessLine(line, context)
            impure.testLine(processedLine, context)

        })
        rl.on('close', impure.summaryOfTest(context))

    } catch (e) {
        impure.errAndExit(e.message)
    }
}


//impure code, that has to be done in global scope: --------------------------------------------------------

const path = require('path')
const fileName = path.resolve(process.argv[2])
    .replace(/\\/g, "/")    //on Windows

console.log(comment(`processing: ${fileName}`))

const nameWithoutExt = (pathName) => path.basename(pathName, path.extname(pathName))
const requireFileStr = `var ${nameWithoutExt(fileName)} = require("${fileName}")`
try {
    eval(requireFileStr)
} catch (e) {
    impure.errAndExit(e.message)
}

impure.app(fileName, core.context)

//----------------------------------------------------------------------------------------------


