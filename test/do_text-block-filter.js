const { compose } = require('folktale/core/lambda')
const Result = require('folktale/result')
const { map, chain } = require('pointfree-fantasy')

const tbf = require('../text-block-filter')
const utils = require('../utils')



const myBlock = tbf.blockCreate(tbf.Regex.JSBlockCommentBegin, tbf.Regex.JSBlockCommentEnd, 'myBlock')


const printResulter = compose.all(
    map(tbf.tap(ctx => console.log(`str='${ctx.lineNum}'`))),
    chain(tbf.resulterFilterLine(s => !tbf.Regex.JSLineComment.test(s))),
    myBlock.resulterFilterBlock(
        ctx => Result.Error(utils.tap(_ => console.log(`begin-----`), ctx)),     //onBlockBegin
        ctx => Result.Error(utils.tap(_ => console.log(`----end`), ctx)),     //onBlockEnd
    ),
    tbf.contextOverLine(s => s.trim()),
    //utils.log,
)

const resulter2 = compose.all(
    map(tbf.contextTapLine(s => console.log(`: '${s}'`))),
    myBlock.resulterFilterBlock(
        Result.Ok,
        Result.Error,
    )
)


const printReducer = tbf.reducerCreate(printResulter)

const reducer2 = tbf.reducerCreate(resulter2)

const main = (strArr, contextReducer) => {
    return strArr.reduce(contextReducer, tbf.contextCreate())
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
