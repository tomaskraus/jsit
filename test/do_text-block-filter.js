const { compose } = require('folktale/core/lambda')
const Result = require('folktale/result')
const { map, chain } = require('pointfree-fantasy')

const tbf = require('../text-block-filter')
const utils = require('../utils')


const myBlockParser = tbf.BlockParser.create(
    tbf.blockBoundaryCreate(tbf.Regex.JSBlockCommentBegin, tbf.Regex.JSBlockCommentEnd), 
    tbf.blockCallbacksCreate(
    ctx => Result.Error(utils.tap(_ => console.log(`begin-----`), ctx)),     //onBlockBegin
    ctx => Result.Error(utils.tap(_ => console.log(`----end`), ctx)),     //onBlockEnd
    ),
    'myBlock'
)


const printResulter = compose.all(
    map(tbf.tap(ctx => console.log(`str='${ctx.lineNum}'`))),
    chain(tbf.resulterFilterLine(s => !tbf.Regex.JSLineComment.test(s))),
    myBlockParser.resulterFilter,
    tbf.contextOverLine(s => s.trim()),
    //utils.log,
)

const createCallCounter = (id) => {
    count = 0
    const countLens = tbf.Lens.makeLenses([id])[id]
    return ctx => tbf.contextOver(countLens, i => ++i || 1, ctx)
}

const startBlockCounter = createCallCounter('beginBlockCount')
const myBlockParser2 = tbf.BlockParser.create(
    tbf.blockBoundaryCreate(tbf.Regex.JSBlockCommentBegin, tbf.Regex.JSBlockCommentEnd), 
    tbf.blockCallbacksCreate(
        ctx => Result.Ok(startBlockCounter(ctx)),
        Result.Ok,
    ),
    'myBlock'
)

const createBeginBlockResulter =
    () => {
        return compose.all(
            map(tbf.tap(ctx => console.log(`${41 + tbf.Lens.view(tbf.CLens.lineNum, ctx)} : '${ctx.line}'`))),
            myBlockParser2.resulterFilter,
            tbf.contextOver(tbf.CLens.line, s => s.trim()),
            //utils.tap(ctx => console.log(ctx))
        )
    }


const printReducer = tbf.reducer(printResulter)

const reducer2 = tbf.reducer(createBeginBlockResulter())

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
