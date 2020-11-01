/**
 * main
 * input logic
 */


const path = require('path');
//const Rx = require('rxjs')
const RxOp = require('rxjs/operators')

const { streamToStringRx } = require('rxjs-stream')
const fs = require('fs')
const split = require('split')
const Task = require('data.task')

const _Msg = require('./messagers/defaultMessager')
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


//prepareEval :: (Evaluator string -> boolean) => (string -> Messager) -> Task Error Evaluator
const prepareEval = (pathForModuleRequire, messager) => {
    //const testEvaluator = { evaluate: s => true }
    //resolve(testEvaluator)

    const nameWithoutExt = (pathName) => path.basename(pathName, path.extname(pathName))
    const sanitizeName = moduleName => moduleName.replace(/-/g, '_')

    return new Task((reject, resolve) => {
        try {
            const moduleName = sanitizeName(nameWithoutExt(pathForModuleRequire))
            messager.header({ 'fileName': pathForModuleRequire, 'moduleName': moduleName})

            const requireFileStr = `var ${moduleName} = require("${pathForModuleRequire}")`
            eval(requireFileStr)
            eval("var assert = require('assert')")
            resolve( { evaluate: str => eval(str) })
        } catch (e) {
            reject(e)
        }
    })
}


const identity = a => a


const fileName = process.argv[2]
fileName == null ?
    console.log('usage: main.js <filename>')
    :
    prepareEval(fileName, _Msg)
        .chain(evaluator => getStreamFromFileName(fileName)
            .map(stream => doWork(stream, evaluator, _Msg))
        )
        .fork(
            error => console.log(`ERROR: ${error.message}`),
            identity
        )
