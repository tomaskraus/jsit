/**
 * Core module. All the essential logic is here.
 * @module core
 */


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

/**
 *: core._preprocessLine(" *:  abc ") === "abc"
 *: core._preprocessLine(" * :  abc ") === ""
 *: core._preprocessLine(" *:   ") === ""
 //*: core._preprocessLine(" *: let a = 10;  ") === "let a = 10;"
 */
const _preprocessLine = line => {
    line = filterLine(line)
    line = isolateLine(line)
        .trim()
    return line
}

const impure = {}

//processLine :: (string -> boolean) -> string -> context -> context
impure.processLine = (evaluationCallback, line, ctx) => {
    ctx.lineNumber++
    ctx.lineText = line
    line = _preprocessLine(line)

    if (line) {
        try {
            result = evaluationCallback(line)
            ctx.stats.totalCount++
            if (result == false) {
                ctx.stats.failCount++
                console.log(`FAIL | Line | ${ctx.lineNumber} | Is | ${result} | Should be | - | File | ${ctx.fileName} | Text | ${ctx.lineText}`)
            }
        } catch (e) {
            console.error(`ERROR | Line | ${ctx.lineNumber} | File | ${ctx.fileName} | Exception | ${e} | Text | ${ctx.lineText}`)
        }
    }

    return ctx
}

// ======================================================================================================


const filterLine = line => {
    let re = /^\s*\*:/
    return re.test(line) ? line : ""
}

const isolateLine = line => {
    let re = /^(\s*\*:)\s(.*$)/
    return line.replace(re, "$2")
}



// ======================================================================================================


module.exports = {
    context,
    impure,

    _preprocessLine,
}

