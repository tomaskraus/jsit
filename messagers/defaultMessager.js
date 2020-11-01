/**
 * Default messager
 * 
 */

const lineCommentAtTheEnd = line => line.replace(/^(.*)\/\/(.*)$/, "$2")
const location = ctx => `${ctx.fileName}:${ctx.lineNum}`


const Msg = {
    header: data => console.log(`START | file: [${data.fileName}] , module: [${data.moduleName}]`),

    describe: ctx =>
        console.log(
            // `[${location(ctx)}] ${ctx.line}`
            `${ctx.line}`
        ),
    testOk: ctx =>
        console.log(
            `OK | '${lineCommentAtTheEnd(ctx.line)}'`
            // {
            //     type: 'Ok',
            //     context: ctx
            // }
        ),
    testFailure: ctx => console.log(
        `FAIL | at: [${location(ctx)}] | message: [${ctx.msg}] | '${ctx.line}'`
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
    summary: ctx => console.log(
        `END | failed tests: [${ctx.stats.numFailed}] | total tests: [${ctx.stats.totalTests}]`
        // ,
        // {
        //     type: 'Summary',
        //     context: ctx
        // }
    ),
}


module.exports = {
    header: Msg.header,
    describe: Msg.describe,
    testOk: Msg.testOk,
    testFailure: Msg.testFailure,
    error: Msg.error, //wrong syntax, evaluation error and so on...
    summary: Msg.summary,
}
