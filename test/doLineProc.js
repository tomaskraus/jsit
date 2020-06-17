const { compose, curry } = require('folktale/core/lambda')
const Result = require('folktale/result')
const { map } = require('pointfree-fantasy')
const lp = require('../lineProc')



const printHandler = compose.all(
    map(lp.tapCtx(lp.lens.input, s => console.log(`str='${s}'`))),
    // lp.log,
    lp.factory.createJSBlockCommentFilter({
        onBlockBegin: ctx => Result.Error(lp.tap(() => console.log(`begin-----`), ctx)),
        onBlockEnd: ctx => Result.Error(lp.tap(() => console.log(`----end`), ctx)),
    }),
)
const processLine = lp.factory.createProcessLine(printHandler)


const main = strArr => {
    return strArr.reduce(processLine, lp.factory.createContext())
}


const strs = `
ahoj
 /*
 svete
 jak se
 */
mas
/*
ja
  ok
 */
`

console.log(main(strs.split('\n')))
