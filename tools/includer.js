const Op = require('rxjs/operators')
const { streamToStringRx } = require('rxjs-stream')
const split = require('split')
const { compose } = require('folktale/core/lambda')
const { map } = require('pointfree-fantasy')

const flt = require('../file-line-tools')
const tbf = require('../text-block-filter')


const includerTagRegexp = /^\s*@@/                          // @@
const getTagName = s => s.replace(/^\s*@@\s*(\w*)/, "$1")


const prepareDefinitionsTask = stream => {
    const definitions = {}
    
    let tagName = ''
    let body = ''

    const beginDefRegex = /^\/\/\/\/\+/   //  ////+
    const endDefRegex = /^\/\/\/\/\-/     //  ////-
    const getDefTagName = s => s.replace(/^\s*\/\/\/\/\+\s*(\w*)/, "$1")

    const defParser = tbf.BlockParser.create(
        tbf.blockBoundaryCreate(
            beginDefRegex, endDefRegex
        ),
        tbf.blockCallbacksCreate(
            ctx => tbf.Result.Error(
                tbf.contextTapLine(s => {
                    tagName = getDefTagName(s)
                    // console.log(`TAG FOUND: ${tagName}`)
                    body = ''
                }, ctx)
            ),

            ctx => tbf.Result.Error(
                tbf.tap(_ => definitions[tagName] = body, ctx)
            )
        ),
        'defB'
    )

    const defResulter = compose.all(
        map(tbf.contextTapLine(s => { body = (body === '') ? body + s : body + '\n' + s})),
        defParser.resulter,
    )

    return new flt.Task((reject, resolve) => {
        flt.lineObservableFromStream(stream)
            .pipe(
                Op.scan(tbf.reducer(defResulter), tbf.contextCreate()),
                Op.last()
            ).subscribe({
                next: res => {
                    defParser.contextFlush(res)
                    resolve(definitions)
                    // console.log('RESOLVED')
                },
                complete: _ => {
                    stream.destroy()
                    // console.log('STREAM DESTROYED')
                },
                error: err => reject(err)
            })
    })
}



const replacer = definitions => s => {
    if (includerTagRegexp.test(s)) {
        const key = getTagName(s)
        const text = definitions[key]
        if (text === undefined) {
            throw new Error(`key [${key}] does not exist!`)
        }
        return text
    }
    return s
}


const placeDefinitions = definitions => {
    streamToStringRx(
        process.stdin.pipe(split())
    ).pipe(
        Op.map(replacer(definitions))
    ).subscribe({
        next: console.log,
        error: err => console.error(`${err}`),
    })
    //rxToStream(ob).pipe(process.stdout);
}


const mainWork = (definitionsFileName) => {
    flt.streamFromFileNameTask(definitionsFileName)
        .chain(prepareDefinitionsTask)
        .map(definitions => placeDefinitions(definitions))
        .fork(
            flt.stdOutVerboseErrorHandler,
            flt.identity
        )
}


const help = appName => {
    console.log(
        `Replaces placeholder lines with a named text found in the definition file. 
        Reads from a standard input, writes to a standard output.

Usage: ${appName} <definitions-file>

`)
}


flt.runCmdLineHelper(
    process.argv,
    help,
    definitionsFileName => mainWork(definitionsFileName)
)