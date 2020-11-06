const { compose } = require('folktale/core/lambda')
const { map } = require('pointfree-fantasy')
const RxOp = require('rxjs/operators')

const flt = require('../file-line-tools')
const tbf = require('../text-block-filter')

const { TestBlock } = require('../TestBlock')


const CommentMode = { comment: 'comment', uncomment: 'uncomment' }
const isCommentMode = str => str === CommentMode.comment

const Marks = {
    startBlockStr: { comment: '//*<+', uncomment: '<-*/' },
    endBlockStr: { comment: '//>+*', uncomment: '/*>-' },
    startBlockRegex: {},//{ comment: '*+/', uncomment: '-*/'},
    endBlockRegex: {},//{ comment: '/+*', uncomment: '/*-'},

    startLineStr: { comment: '////<+', uncomment: '////<-' },
    endLineStr: { comment: '////>+', uncomment: '////>-' },
    startLineRegex: {},//{ comment: '*+/', uncomment: '-*/'},
    endLineRegex: {},//{ comment: '/+*', uncomment: '/*-'},
}

const indentStr = "    "

const work = (stream, fileName, commentMode) => {

    const testBlock = TestBlock.create(
        compose.all(
            tbf.Result.Ok, //we also want to show headers
            tbf.tap(c => TestBlock.isInCommentBlock(c)
                ? console.log(Marks.startBlockStr[commentMode])
                : console.log(Marks.startLineStr[commentMode])
            ),
        ),

        compose.all(
            tbf.Result.Error,
            tbf.tap(c => TestBlock.isInCommentBlock(c)
                ? console.log(Marks.endBlockStr[commentMode])
                : console.log(Marks.endLineStr[commentMode])
            ),
        )
    )


    const removeLineComment = line => line.replace(/^(\/\/)(.*)$/, "$2")
    const repairUncommentedTestHeader = line => line.replace(/^:::(.*)$/, "//:::$1")

    const addLineComment = line => line.replace(/^(.*)$/, "//$1")
    const repairOvercommentedTestHeader = line => line.replace(/^\/\/\/\/:::(.*)$/, "//:::$1")

    commentAction = tbf.contextOverLine(
        compose(repairOvercommentedTestHeader, addLineComment)
    )

    uncommentAction = tbf.contextOverLine(
        compose(repairUncommentedTestHeader, removeLineComment)
    )

    const allResulter = compose.all(
        res => res.orElse(
            c => tbf.Result.Error(
                tbf.tap(cs => console.log(`${cs.original}`), c)
            )
        ),
        map(tbf.tap(c => console.log(`${indentStr}${c.line}`))),
        map(c => (!isCommentMode(commentMode) && !TestBlock.isInCommentBlock(c))
            ? uncommentAction(c)
            : flt.identity(c)
        ),
        map(c => (isCommentMode(commentMode) && !TestBlock.isInCommentBlock(c))
            ? commentAction(c)
            : flt.identity(c)
        ),
        testBlock.resulter,
    )


    // console.log(`processing: ${fileName}`)

    flt.lineObservableFromStream(stream)
        .pipe(
            RxOp.scan(tbf.reducer(allResulter), tbf.contextCreate()),
            RxOp.last()
        )
        .subscribe({
            next: res => {
                testBlock.flush(res)
            },
            complete: _ => {
                stream.destroy()
            }
        })
}


const parseCommentMode = argv => argv[2] === '-u'
    ? CommentMode.uncomment
    : CommentMode.comment


const help = appName => {
    console.log(
        `(Un)comments inline-tests in the file.

Usage: ${appName} [-u] <filename>

flags: 
-u : Uncomments inline tests. If not present, comments inline tests.
    `)
}

flt.runCmdLineHelper(
    process.argv,
    help,
    nameOfFile =>
        flt.streamFromFileNameTask(nameOfFile)
            .map(stream => work(stream, nameOfFile, parseCommentMode(process.argv)))
            .fork(
                flt.stdOutErrorHandler,
                flt.identity
            )
)

