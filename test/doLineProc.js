const { compose, curry } = require('folktale/core/lambda')
const Result = require('folktale/result')
const { map } = require('pointfree-fantasy')
const lp = require('../lineProc')
const utils = require('../utils')


const printResulter = compose.all(
        map(lp.tapCtxProp(lp.Lens.input, s => console.log(`str='${s}'`))),
        lp.ctxBlockResulter.jsCommentBlock({
            onBlockBegin: ctx => Result.Error(utils.tap(() => console.log(`begin-----`), ctx)),
            onBlockEnd: ctx => Result.Error(utils.tap(() => console.log(`----end`), ctx)),
        }),
        //utils.log,
    )

const printReducer = lp.Factory.createCtxReducer(
    lp.ctxResultable2Action(printResulter)
)


const main = strArr => {
    return strArr.reduce(printReducer, lp.Factory.createContext())
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
