/**
 * Core module. All the essential logic is here.
 * @module core
 */


context = {
    fileName: "",
    lineText: "",
    lineNumber: 0,
    commentFlag: false,
    stats: {
        failCount: 0,
        totalCount: 0
    }
}

preprocessLine = (line, context) => {
    line = parseLine(line, context)
    line = filterLine(line, context)
    line = isolateLine(line, context)
    return line
}

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



// ======================================================================================================


module.exports = {
    context,
    preprocessLine,
}

