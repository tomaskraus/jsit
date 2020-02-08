/* Main routine */



const readline = require('readline');


const createProcessLine = (ctx) => {
    return (line) => {
        line = parseLine(line, ctx)
        testLine(line, ctx)
        //console.log(`${ctx.lineNumber} Received: ${line}`);
    }
}



const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

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

rl.on('line', createProcessLine(context))

const testSummary = (ctx) => {
    return () => {
        console.log(`END | Failures | ${ctx.stats.failCount} | Tests | ${ctx.stats.totalCount}`)
    }
}

rl.on('close', testSummary(context))



//-------------------------------------------------

const parseLine = (line, ctx) => {
    ctx.lineNumber++
    ctx.lineText = line
    return line
}


const testLine = (line, ctx) => {
    result = eval(line)
    ctx.stats.totalCount++
    if (result == false) {
        ctx.stats.failCount++
        console.log(`FAIL | Line | ${ctx.lineNumber} | Should be | - | Is | - | File | ${ctx.fileName} | Text | ${ctx.lineText}`)
    }
}
