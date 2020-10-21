// TODO delete or move this example

const Rx = require('rxjs')
const RxOp = require('rxjs/operators')
const { streamToStringRx } = require('rxjs-stream')
const fs = require('fs')
const split = require('split')


const fileName = process.argv[2] || null

const readStream = fileName == null ?
    process.stdin
    :
    fs.createReadStream(fileName, { encoding: 'utf8' })
const readStreamLines = readStream.pipe(split())

const ob = streamToStringRx(readStreamLines)
    .pipe(
        RxOp.map(text => `//-- ${text.toUpperCase()}`)
    )


ob.subscribe({
    next: s => console.log(s.toUpperCase()),

    complete: s => {
        readStream.destroy()
        console.log('---end---')
    }
    ,
})