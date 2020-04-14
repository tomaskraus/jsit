/**
 * Everything about single line testing
 * 
 * @module evalProc
 */

const { compose, curry } = require('folktale/core/lambda')
const { map, chain } = require('pointfree-fantasy')
const Result = require('folktale/result')
const L = require('lenses')
const lp = require("./lineProc")


// lenses   for evaluation-param 
const lens = L.makeLenses(['blockTestLineNum'])

// regexes ----------------------------

const beginTestCommentMark = /^\s*:::.*/s
const endTestCommentMark = /^\s*$|^\s*\*/s      //matches also "*". This is for tests inside documentation-block comment

// handlers ----------------------------
// ctx -> Result ctx

const filterTestLineInBlockHandler = beginTestBlockHandler => compose.all(
    chain(lp.filters.filterExcludeOutputLine(lp.regex.lineComment)), //removes line-commented lines in the test block
    chain(lp.filters.filterBlockComment(beginTestCommentMark, endTestCommentMark,
        lens.blockTestLineNum, beginTestBlockHandler)),
    lp.handlers.filterBlockHandler,
)


const printBeginTestBlockOutputHandler = ctx => {
    const ln = removeBeginTestBlockComment(L.view(lp.lens.output, ctx)).trim()
    if (ln) {
        console.log(ln)
    }
    return Result.Error(ctx)
}


// line transformers  
// str -> str

const removeBeginTestBlockComment = line => line.replace(/^(\s*:::)\s*(.*$)/, "$2")


//==================================================================================

module.exports = {
    //ctx -> Result ctx
    handlers: {
        filterTestLineInBlockHandler,
        printBeginTestBlockOutputHandler,
    },

    regex: {
        beginTestCommentMark,
        endTestCommentMark,
    },

}
