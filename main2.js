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




const doWork = (stream) => {
    const testEvaluator = s => true
    const runner = tr.createRunner(_Msg, testEvaluator)

    const readStreamLines = stream.pipe(split())
    const ob = streamToStringRx(readStreamLines)
        .pipe(
            RxOp.scan(runner.reducer, runner.createContext()),
            RxOp.last()
        )
        .subscribe({
            next: res => {
                _Msg.summary(
                    runner.flush(res)
                )
            },
            complete: _ => {
                stream.destroy()
                console.log('---end---')
            }
        })
}


const getStreamFromFileName = path => {
    return new Task((reject, resolve) => {
        const readStream = fs.createReadStream(path, { encoding: 'utf8' })
        readStream.on('open', _ => resolve(readStream)) //we want a stream object, not its data
        readStream.on('error', error => reject(error))
    })
}


const fileName = process.argv[2] || null
fileName == null ?
    console.log('usage: main.js <filename>')
    :
    getStreamFromFileName(fileName)
        .fork(
            error => console.log(error.message),
            data => doWork(data)
        )
