const { compose } = require('folktale/core/lambda')
const Result = require('folktale/result')
const { map } = require('pointfree-fantasy')
const bp = require('../blockProc')
const utils = require('../utils')



const myBlockProc = bp.Factory.createBlockObj(bp.Regex.beginJSBlockComment, bp.Regex.endJSBlockComment, 'myBlock')
// console.log('', myBlockProc.result)

//blockProc.result :: ctx -> Result ctx ctx    
//blockProc.endBlockSafely :: ctx -> ctx

const printResulter = compose.all(
    map(bp.tapCtxLens(bp.Lens.original, s => console.log(`str='${s}'`))),
    myBlockProc.resulter(
        ctx => Result.Error(utils.tap(() => console.log(`begin-----`), ctx)),     //onBlockBegin
        null,              //onBlock
        ctx => Result.Ok(utils.tap(() => console.log(`----end`), ctx)),     //onBlockEnd
    )
    //utils.log,
)

const resulter2 = compose.all(
    map(bp.tapCtxLens(bp.Lens.original, s => console.log(`: '${s}'`))),
    myBlockProc.resulter(
        Result.Ok,
        Result.Ok,
        Result.Error
    )
)


const printReducer = bp.Factory.createCtxReducer(
    bp.ctxResultable2Action(printResulter)
)

const reducer2 = bp.Factory.createCtxReducer(
    bp.ctxResultable2Action(resulter2)
)

const main = (strArr, reducer) => {
    return strArr.reduce(reducer, bp.Factory.createContext())
}


const strs = `
ahoj
 /*
 svete
 jak se
 */
// pokus
// 1. radek
// 2. radek


 mas
/* huhu */
/*
ja
  ok
 */
`

console.log(main(strs.split('\n'), printReducer))
console.log(main(strs.split('\n'), reducer2))
