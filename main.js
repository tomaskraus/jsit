/**
 * main
 * input logic
 */

const RxOp = require('rxjs/operators')
const path = require('path');

const flt = require('./file-line-tools');

const _Messager = require('./messagers/defaultMessager')
const { TestRunner } = require('./TestRunner');


const doWork = (stream, testEvaluator, messager, fileName) => {
    const runner = TestRunner.create(messager, testEvaluator)
    
    flt.lineObservableFromStream(stream)
        .pipe(
            RxOp.scan(runner.reducer, runner.createContext(fileName)),
            RxOp.last()
        )
        .subscribe({
            next: res => {
                messager.summary(
                    runner.flush(res)
                )
            },
            complete: _ => {
                stream.destroy()
            }
        })
}


// prepareEvaluatorTask :: (Evaluator string -> boolean) => (string -> Messager) -> Task Error Evaluator
const prepareEvaluatorTask = (pathForModuleRequire, messager) => {
    const nameWithoutExt = (pathName) => path.basename(pathName, path.extname(pathName))
    const sanitizeName = moduleName => moduleName.replace(/-/g, '_')

    return new flt.Task((reject, resolve) => {
        try {
            const moduleName = sanitizeName(nameWithoutExt(pathForModuleRequire))
            messager.header({ 'fileName': pathForModuleRequire, 'moduleName': moduleName })

            const requireFileStr = `var ${moduleName} = require("${pathForModuleRequire}")`
            eval(requireFileStr)
            eval("var assert = require('assert')")
            resolve({ evaluate: str => eval(str) })
        } catch (e) {
            reject(e)
        }
    })
}



//---------------------------------------------------------------------------------------------------------


flt.runCmdLineHelper(
    process.argv,
    'Runs inline-tests in the file.',
    nameOfFileToBeTested =>
        prepareEvaluatorTask(nameOfFileToBeTested, _Messager)
            .chain(evaluator =>
                flt.streamFromFileNameTask(nameOfFileToBeTested)
                    .map(stream => doWork(stream, evaluator, _Messager, nameOfFileToBeTested))
            )
            .fork(
                flt.stdOutErrorHandler,
                flt.identity
            )
)
