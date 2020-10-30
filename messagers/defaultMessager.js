/**
 * Default messager
 * 
 */

const Msg = {
    describe: ctx => console.log(`${ctx.line}`),
    testOk: ctx =>
        console.log(
            `OK   ${/*DATA_LINE_START + */ ctx.lineNum} :\t'${ctx.line}'`
            // {
            //     type: 'Ok',
            //     context: ctx
            // }
        ),
    testFailure: ctx => console.log(
        `FAIL ${/*DATA_LINE_START + */ ctx.lineNum} :\t'${ctx.line}'`
        // {
        //     type: 'Failure',
        //     context: ctx
        // }
    ),
    //wrong syntax, evaluation error and so on...
    error: ctx => console.log({
        type: 'Error',
        context: ctx
    }),
    summary: ctx => console.log({
        type: 'Summary',
        context: ctx
    }),
}


module.exports = {
    describe: Msg.describe,
    testOk: Msg.testOk,
    testFailure: Msg.testFailure,
    error: Msg.error, //wrong syntax, evaluation error and so on...
    summary: Msg.summary,
}
