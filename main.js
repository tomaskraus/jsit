/**
 * main
 * input logic
 */

const { Subject } = require('rxjs')
const RxOp = require('rxjs/operators')
const path = require('path')
const getStdin = require('get-stdin');

const flt = require('./file-line-tools')

const _Messager = require('./messagers/defaultMessager')
const { TestRunner } = require('./TestRunner')



const doWork = (stream, testEvaluator, messager, fileName, testCompleteCallback) => {
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
                testCompleteCallback()
            }
        })
}


// prepareEvaluatorTask :: (Evaluator string -> boolean) => (string -> Messager) -> Task Error Evaluator
const prepareEvaluatorTask = (pathForModuleRequire, messager) => {
    const nameWithoutExt = (pathName) => path.basename(pathName, path.extname(pathName))
    const sanitizeName = moduleName => moduleName.replace(/-/g, '_')

    return new flt.Task((reject, resolve) => {
        try {
            var moduleName = sanitizeName(nameWithoutExt(pathForModuleRequire))
            messager.header({ 'fileName': pathForModuleRequire, 'moduleName': moduleName })

            eval("var assert = require('assert')")

            const requireFileStr = `var ${moduleName} = require("./${pathForModuleRequire}")`
            eval(requireFileStr)

            var registerModuleFields = (nameOfModule) => {
                for (var key in nameOfModule) {
                    if (nameOfModule.hasOwnProperty(key)) {

                        //global name clash check
                        //TODO: meke this check optional, from cmdline
                        if (typeof global[key] !== 'undefined') {
                            throw new Error(
                                `The [${pathForModuleRequire}] module's exported key [${key}] is already defined in the global context. Should not be redefined!
  
  Note: this could also happen if you defined an exported [${key}] item in [${pathForModuleRequire}] globally, i.e. without const/let/var keywords.`)
                            // however, in cannot prevent the imported file to overwrite global field directly, i.e. not by module.exports
                        }

                        global[key] = nameOfModule[key]
                    }
                }
            }

            eval(`registerModuleFields(${moduleName})`)

            resolve({ evaluate: str => eval(str) })
        } catch (e) {
            reject(e)
        }
    })
}


const testDoneCallback = () => { return } //console.log('= = = = = Tadaa! = = = =')

const testTheFile = (nameOfFileToBeTested, testCompleteCB, errorCB) =>
    prepareEvaluatorTask(nameOfFileToBeTested, _Messager)
        .chain(evaluator =>
            flt.streamFromFileNameTask(nameOfFileToBeTested)
                .map(stream => doWork(stream, evaluator, _Messager, nameOfFileToBeTested, testCompleteCB))
        )
        .fork(
            errorCB,
            flt.identity
        )


const testFilesFromInputStream = () => {
    getStdin().then(
        s => {
            const lines = s
                .split('\n')
                .filter(s => s.length > 0)
            const lSub = flt.LinesSubj(lines)
            lSub.subscribe({
                next: fileName => {
                    // console.log(`name=${fileName}`)
                    // lSub.next()
                        testTheFile(fileName, lSub.next, flt.stdOutErrorHandler)
                },
                complete: testDoneCallback,
                error: flt.stdOutErrorHandler
            })
            lSub.next()
        },
        err => console.error(err),
    )

}


const processParam = arg => arg === '-i'
    ? testFilesFromInputStream()
    : testTheFile(arg, testDoneCallback, flt.stdOutErrorHandler)

//---------------------------------------------------------------------------------------------------------


flt.runCmdLineHelper(
    process.argv,
    'Runs inline-tests in the file.',
    processParam
)
