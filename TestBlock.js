/**
 * test block parser
 * - filters test-block lines
 * - tells whether a test-block is inside block-comment
 */

const { compose } = require('folktale/core/lambda')
const { map, chain } = require('pointfree-fantasy')
const tbf = require('./text-block-filter')


const trimStr = s => s.trim()

const testBlockBeginRegex = /^\/\/:::/
const testBlockEndRegex = /^[^\/]|^.[^\/]|^\s*$/      //notLineComment


const COMMENT_BLOCK_ID = 'cBlock';
const commentBlockLens = tbf.createLens(COMMENT_BLOCK_ID)
const isInCommentBlock = ctx => tbf.Lens.view(commentBlockLens, ctx) > 0


const createTestBlock = (blockBeginCallback, blockEndCallback) => {
    const testParser = tbf.BlockParser.create(
        tbf.blockBoundaryCreate(testBlockBeginRegex, tbf.Regex.blankLine),
        tbf.blockCallbacksCreate(blockBeginCallback, blockEndCallback),
        'tBlock'
    )

    //---------------------------------------------------

    const lineCommentParser = tbf.BlockParser.create(
        tbf.blockBoundaryCreate(testBlockBeginRegex, testBlockEndRegex),
        tbf.blockCallbacksCreate(
            tbf.Result.Ok,

            compose(
                tbf.Result.Error,
                testParser.contextFlush,
            )
        ),
        'lBlock'
    )


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
        lineCommentParser.resulterFilter,
    )


    const commentBlockParser = tbf.BlockParser.create(
        tbf.blockBoundaryCreate(tbf.Regex.JSBlockCommentBegin, tbf.Regex.JSBlockCommentEnd),
        tbf.blockCallbacksCreate(
            tbf.Result.Error,
            
            compose(
                tbf.Result.Error,
                testParser.contextFlush,
            )
        ),
        COMMENT_BLOCK_ID
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


    //---------------------------------------------------


    const resulter = compose.all(
        chain(testParser.resulterFilter),
        result => result.orElse(
            lineCommentResulter
        ),
        blockCommentResulter,
        tbf.contextOverLine(trimStr),
    )


    const flush = testParser.contextFlush


    return {
        resulter,
        flush,
    }
}


//==================================================================================

module.exports = {
    TestBlock: {
        create: createTestBlock,
        isInCommentBlock,
        blockBeginRegex: testBlockBeginRegex,
        blockEndRegex: testBlockEndRegex,
    }
}
