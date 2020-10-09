const { compose } = require('folktale/core/lambda')
const Result = require('folktale/result')
const { map, chain } = require('pointfree-fantasy')

const tbf = require('../text-block-filter')
const utils = require('../utils')



const myBlock = tbf.block(tbf.Regex.beginJSBlockComment, tbf.Regex.endJSBlockComment, 'myBlock')


const printResulter = compose.all(
    map(tbf.tapContext(tbf.Lens.original, s => console.log(`str='${s}'`))),
    chain(tbf.filterLineResult(s => !tbf.Regex.JSLineComment.test(s))),
    myBlock.filterBlockResult(
        ctx => Result.Error(utils.tap(() => console.log(`begin-----`), ctx)),     //onBlockBegin
        ctx => Result.Error(utils.tap(() => console.log(`----end`), ctx)),     //onBlockEnd
    ),
    // tbf.tapContext(tbf.Lens.line, console.log),
    tbf.overLineContext(s => s.trim()),
    //utils.log,
)

const resulter2 = compose.all(
    map(tbf.tapLineContext(s => console.log(`: '${s}'`))),
    myBlock.filterBlockResult(
        Result.Ok,
        Result.Error,
    )
)


const printReducer = tbf.reducer(printResulter)

const reducer2 = tbf.reducer(resulter2)

const main = (strArr, reducer) => {
    return strArr.reduce(reducer, tbf.createContext())
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
 //abc
  ok
 */
`

console.log(main(strs.split('\n'), printReducer))
console.log(main(strs.split('\n'), reducer2))
