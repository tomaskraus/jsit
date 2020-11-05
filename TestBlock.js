/**
 * test block parser
 * - filters test-block lines
 * - tells whether a test-block is inside block-comment
 */

const { compose } = require('folktale/core/lambda')
const { map, chain } = require('pointfree-fantasy')
const tbf = require('./text-block-filter')


const trimStr = s => s.trim()
const isLineComment = s => tbf.Regex.JSLineComment.test(s)


const removeLineComment = line => line.replace(/^(\/\/)(.*)$/, "$2")
const repairTestHeader = line => line.replace(/^:::(.*)$/, "//:::$1")
const lineCommentResulter = compose.all(
    map(tbf.contextOverLine(
        compose.all(
            repairTestHeader, //restore the test header we've stripped earlier
            trimStr,
            removeLineComment
        )
    )),
    tbf.resulterFilterLine(isLineComment),
)


const commentBlockParser = tbf.BlockParser.create(
    tbf.blockBoundaryCreate(tbf.Regex.JSBlockCommentBegin, tbf.Regex.JSBlockCommentEnd),
    tbf.blockCallbacksCreate(
        ctx => tbf.Result.Error(ctx),
        ctx => tbf.Result.Error(ctx)
    ),
    'cBlock'
)

const removeBlockCommentStar = line => line.replace(/(\s)*\*(.*)$/, "$1$2")
const blockCommentResulter = compose.all(
    map(tbf.contextOverLine(
        compose(
            trimStr,
            removeBlockCommentStar
        )
    )),
    commentBlockParser.resulterFilter,
)


const testBlockCreator = (blockBeginCallback, blockEndCallback) => {
    const parser = tbf.BlockParser.create(
        tbf.blockBoundaryCreate(/^\/\/:::/, tbf.Regex.blankLine),
        tbf.blockCallbacksCreate(blockBeginCallback, blockEndCallback),
        'tBlock'
    )


    const resulter = ctx => compose.all(
        chain(parser.resulterFilter),
        result => result.orElse(
            lineCommentResulter
        ),
        blockCommentResulter,
        tbf.contextOverLine(trimStr),
    )(ctx)


    const flush = ctx => parser.contextFlush(ctx)

    
    return {
        resulter,
        flush,
    }
}


//==================================================================================

module.exports = {
    TestBlock: {
        create: testBlockCreator,
    }
}
