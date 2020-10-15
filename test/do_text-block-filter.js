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

const createCallCounter = (id) => {
    count = 0
    const countLens = tbf.Lens.makeLenses([id])[id]
    return ctx => tbf.contextOver(countLens, i => ++i || 1, ctx)
}

const createBeginBlockResulter =
    () => {
        const startBlockCounter = createCallCounter('beginBlockCount')
        return compose.all(
            map(tbf.tap(ctx => console.log(`${41 + tbf.Lens.view(tbf.CLens.lineNum, ctx)} : '${ctx.line}'`))),
            myBlock.resulterFilterBlock(
                ctx => Result.Ok(startBlockCounter(ctx)),
                Result.Ok,
            ),
            tbf.contextOver(tbf.CLens.line, s => s.trim()),
            //utils.tap(ctx => console.log(ctx))
        )
    }


const printReducer = tbf.reducerCreate(printResulter)

const reducer2 = tbf.reducerCreate(createBeginBlockResulter())

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
