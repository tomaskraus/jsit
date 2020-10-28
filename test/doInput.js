// TODO delete or move this example

const Rx = require('rxjs')
const RxOp = require('rxjs/operators')
const { streamToStringRx } = require('rxjs-stream')
const fs = require('fs')
const split = require('split')
const Task = require('data.task')




const doWork = (stream) => {
    const readStreamLines = stream.pipe(split())
    const ob = streamToStringRx(readStreamLines)
        .pipe(
            RxOp.map(text => `//-- ${text}`)
        )

    ob.subscribe({
        next: s => console.log(s.toUpperCase()),

        complete: s => {
            stream.destroy()
            console.log('---end---')
        }
        ,
    })

}


const getStreamFromFileName = path => {
    return new Task((reject, resolve) => {
        const readStream = fs.createReadStream(path, { encoding: 'utf8' })
        readStream.on('open', _ => resolve(readStream)) //we want a stream object, not its data
        readStream.on('error', error => reject(error))
    })
}


let fileName = process.argv[2] || null
fileName == null ?
    doWork(process.stdin)
    :
    getStreamFromFileName(fileName)
        .fork(
            error => console.log(error.message),
            data => doWork(data)
        )
