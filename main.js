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

const _Messager = require('./messagers/defaultMessager')
const tr = require('./TestRunner')




const doWork = (stream, testEvaluator, messager, fileName) => {
    const runner = tr.createRunner(messager, testEvaluator)
    const readStreamLines = stream.pipe(split())
    streamToStringRx(readStreamLines)
        .pipe(
            RxOp.scan(runner.reducer, runner.createContext(fileName)),
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

//getStreamFromFileNameTask :: string -> Task Error Stream
const getStreamFromFileNameTask = path => {
    return new Task((reject, resolve) => {        
        const readStream = fs.createReadStream(path, { encoding: 'utf8' })
        readStream.on('open', _ => resolve(readStream)) //we want a stream object, not its data
        readStream.on('error', error => reject(error))
    })
}


//prepareEvaluatorTask :: (Evaluator string -> boolean) => (string -> Messager) -> Task Error Evaluator
const prepareEvaluatorTask = (pathForModuleRequire, messager) => {
    const nameWithoutExt = (pathName) => path.basename(pathName, path.extname(pathName))
    const sanitizeName = moduleName => moduleName.replace(/-/g, '_')

    return new Task((reject, resolve) => {
        try {
            const moduleName = sanitizeName(nameWithoutExt(pathForModuleRequire))
            messager.header({ 'fileName': pathForModuleRequire, 'moduleName': moduleName })

            const requireFileStr = `var ${moduleName} = require("${pathForModuleRequire}")`
            eval(requireFileStr)
            eval("var assert = require('assert')")
            resolve({ evaluate: str => eval(str) })
        } catch (e) {
            reject(e)
        }
    })
}


const identity = a => a


//---------------------------------------------------------------------------------------------------------


const nameOfFileToBeTested = process.argv[2]
nameOfFileToBeTested == null ?
    console.log('usage: main.js <filename>')
    :
    prepareEvaluatorTask(nameOfFileToBeTested, _Messager)
        .chain(evaluator =>
            getStreamFromFileNameTask(nameOfFileToBeTested)
                .map(stream => doWork(stream, evaluator, _Messager, nameOfFileToBeTested))
        )
        .fork(
            error => console.log(`ERROR: ${error.message}`),
            identity
        )
