const { compose } = require('folktale/core/lambda')
const { map } = require('pointfree-fantasy')
const RxOp = require('rxjs/operators')

const flt = require('./../file-line-tools')
const tbf = require('./../text-block-filter')

const { TestBlock } = require('./../TestBlock')



const work = (stream, fileName) => {

    const testBlock = TestBlock.create(
        compose.all(
            map(tbf.tap(c => console.log(`line: ${c.lineNum}`))),
            tbf.Result.Ok,
        ),

        tbf.Result.Error,
    )

    const linesResulter = compose.all(
        map(tbf.tap(c => console.log(`${c.original}`))),
        //tbf.Result.Ok,
        testBlock.resulter
    )


    console.log(`processing: ${fileName}`)

    flt.lineObservableFromStream(stream)
        .pipe(
            RxOp.scan(tbf.reducer(linesResulter), tbf.contextCreate()),
            RxOp.last()
        )
        .subscribe({
            next: res => {
                console.log(
                    testBlock.flush(res)
                )
            },
            complete: _ => {
                stream.destroy()
            }
        })
}


flt.runCmdLineHelper(
    process.argv,
    'Lists inline-tests in the file.',
    nameOfFile =>
        flt.streamFromFileNameTask(nameOfFile)
            .map(stream => work(stream, nameOfFile))
            .fork(
                flt.stdOutErrorHandler,
                flt.identity
            )
)

