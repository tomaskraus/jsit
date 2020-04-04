/* Main routine */

const comment = str => `// ${str}`

const errAndExit = msg => {
    console.error(msg)
    // process.exit(1)
    process.exitCode = 1    //soft exit, allowing things to close itself properly
}

const context = {
    fileName: "",
    lineText: "",
    lineNumber: 0,
    commentFlag: false,
    stats: {
        failCount: 0,
        totalCount: 0
    }
}

//place all impure functions under this
const Impure = {}

Impure.testLine = (line, ctx) => {
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


const createProcessLine = context => line => {
    line = parseLine(line, context)
    line = filterLine(line, context)
    line = isolateLine(line, context)
    Impure.testLine(line, context)
    //console.log(`${ctx.lineNumber} Received: ${line}`);
}

const summaryOfTest = (ctx) => {
    return () => {
        console.log(`END | Failures | ${ctx.stats.failCount} | Tests | ${ctx.stats.totalCount}`)
    }
}

Impure.app = (filename, context) => {
        try {
            context.fileName = fileName

            const fs = require('fs');
            const rs = fs.createReadStream(filename)
            rs.on('error', err => errAndExit(err.message))

            const readline = require('readline');
            const rl = readline.createInterface({
                input: rs,
                output: process.stdout,
                terminal: false,
            });
            rl.on('line', createProcessLine(context))
            rl.on('close', summaryOfTest(context))

        } catch (e) {
            errAndExit(e.message)
        }
    }


//impure code, that has to be done in global scope: --------------------------------------------------------


const path = require('path')
const fileName = path.resolve(process.argv[2])
    .replace(/\\/g, "/")    //on Windows

console.log(comment(`processing: ${fileName}`))


Impure.app(fileName, context)


const nameWithoutExt = (pathName) => path.basename(pathName, path.extname(pathName))
const requireFileStr = `var ${nameWithoutExt(fileName)} = require("${fileName}")`
//console.log("cmdStr:", requireFileCommandStr)

try {
    eval(requireFileStr)
} catch (e) {
    errAndExit(e.message)
}
//----------------------------------------------------------------------------------------------


// ======================================================================================================

const parseLine = (line, ctx) => {
    ctx.lineNumber++
    ctx.lineText = line
    return line
}

const filterLine = (line, ctx) => {
    let re = /^\s*\*:/
    return re.test(line) ? line : ""
}

const isolateLine = (line, ctx) => {
    let re = /^(\s*\*:)\s(.*$)/
    return line.replace(re, "$2")
}

