const { compose, curry } = require('folktale/core/lambda')
const Result = require('folktale/result')
const { map } = require('pointfree-fantasy')
const bp = require('../blockProc')
const utils = require('../utils')


const printResulter = compose.all(
        map(bp.tapCtxLens(bp.Lens.input, s => console.log(`str='${s}'`))),
        bp.ctxBlockResulter.jsCommentBlock({
            onBlockBegin: ctx => Result.Error(utils.tap(() => console.log(`begin-----`), ctx)),
            onBlockEnd: ctx => Result.Error(utils.tap(() => console.log(`----end`), ctx)),
        }),
        //utils.log,
    )

const printReducer = bp.Factory.createCtxReducer(
    bp.ctxResultable2Action(printResulter)
)


const main = strArr => {
    return strArr.reduce(printReducer, bp.Factory.createContext())
}


const strs = `
ahoj
 /*
 svete
 jak se
 */
mas
/* huhu */
/*
ja
  ok
 */
`

console.log(main(strs.split('\n')))
