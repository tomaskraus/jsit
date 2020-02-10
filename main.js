/* Main routine */

const fs = require('fs');

const readline = require('readline');


const createProcessLine = (ctx) => {
    return (line) => {
        line = parseLine(line, ctx)
        line = filterLine(line, ctx)
        line = isolateLine(line, ctx)
        testLine(line, ctx)
        //console.log(`${ctx.lineNumber} Received: ${line}`);
    }
}


const fileName = process.argv[2]

const context = {
    fileName,
    lineText: "",
    lineNumber: 0,
    commentFlag: false,
    stats: {
        failCount: 0,
        totalCount: 0
    }
}

try {

    const rl = readline.createInterface({
        input: fs.createReadStream(context.fileName),
        output: process.stdout,
        terminal: false,      
    });
    rl.on('line', createProcessLine(context))
    
    const testSummary = (ctx) => {
        return () => {
            console.log(`END | Failures | ${ctx.stats.failCount} | Tests | ${ctx.stats.totalCount}`)
        }
    }
    
    rl.on('close', testSummary(context))

} catch (e) {
    console.log(e)
}
    

//-------------------------------------------------

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


const testLine = (line, ctx) => {
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
        console.log(`ERROR | Line | ${ctx.lineNumber} | File | ${ctx.fileName} | Exception | ${e} | Text | ${ctx.lineText}`)
    }
}
