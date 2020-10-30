/**
 * main
 * input logic
 */


//const Rx = require('rxjs')
const RxOp = require('rxjs/operators')

const { streamToStringRx } = require('rxjs-stream')
const fs = require('fs')
const split = require('split')
const Task = require('data.task')

const _Msg = require('./messagers/default')
const tr = require('./test-runner')




const doWork = (stream, testEvaluator, messager) => {
    const runner = tr.createRunner(messager, testEvaluator)
    const readStreamLines = stream.pipe(split())
    streamToStringRx(readStreamLines)
        .pipe(
            RxOp.scan(runner.reducer, runner.createContext()),
            RxOp.last()
        )
        .subscribe({
            next: res => {
                messager.summary(
                    runner.flush(res)
                )
            },
            complete: _ => {
                stream.destroy()
            }
        })
}

//getStreamFromFileName :: string -> Task Error Stream
const getStreamFromFileName = path => {
    return new Task((reject, resolve) => {
        //reject(new Error('Stream is not ready!'))
        const readStream = fs.createReadStream(path, { encoding: 'utf8' })
        readStream.on('open', _ => resolve(readStream)) //we want a stream object, not its data
        readStream.on('error', error => reject(error))
    })
}

//prepareEval :: (Evaluator string -> boolean) => string -> Task Error Evaluator
const prepareEval = path => {
    // const nameWithoutExt = (pathName) => path.basename(pathName, path.extname(pathName))
    // const sanitizeName = moduleName => moduleName.replace('-', '_')

    return new Task((reject, resolve) => {

        // const moduleName = nameWithoutExt(pathForModuleRequire)
        // const requireFileStr = `var ${sanitizeName(moduleName)} = require("${fileName}")`
        // console.log(`BEGIN | Module | ${moduleName} | File | ${fileName}`)

        // const outerImpure = impure
        // try {
        //     eval(requireFileStr)
        //     eval("var assert = require('assert')")
        //     return { eval: str => eval(str) }
        // } catch (e) {
        //     outerImpure.errAndExit(e)
        //     return { eval: null }
        // }


        const testEvaluator = { eval: s => true }
        resolve(testEvaluator)
        // reject(new Error("prepare evaluation not implemented"))
    })
}


const identity = a => a


const fileName = process.argv[2]
fileName == null ?
    console.log('usage: main.js <filename>')
    :
    prepareEval(fileName)
        .chain(evaluator => getStreamFromFileName(fileName)
            .map(stream => doWork(stream, evaluator, _Msg))
        )
        .fork(
            error => console.log(`ERROR: ${error.message}`),
            identity
        )
