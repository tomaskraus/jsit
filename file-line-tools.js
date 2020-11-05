/**
 * A bunch of command-line and file line processing functions.
 * 
 */

const RxOp = require('rxjs/operators')

const path = require('path');
const { streamToStringRx } = require('rxjs-stream')
const fs = require('fs')
const split = require('split')
const Task = require('data.task')


/**
 * streamFromFileNameTask :: (string -> readStreamOptions) -> Task Error Stream
 */
const streamFromFileNameTask = (path, readStreamOptions) => {
    return new Task((reject, resolve) => {
        const readStream = fs.createReadStream(path, readStreamOptions || { encoding: 'utf8' })
        readStream.on('open', _ => resolve(readStream)) //we want a stream object, not its data
        readStream.on('error', error => reject(error))
    })
}

/**
 * Returns an Observable of text lines.
 * 
 * lineObservableFromStream :: stream -> Task Error Observable
 * 
 * @param {Stream} stream 
 */
const lineObservableFromStream = stream => streamToStringRx(stream.pipe(split()))

const _defaultHelp = (applicationName, helpStr = null) => {
    if (helpStr) console.log(helpStr)
    console.log(`Usage: ${applicationName} <filename>`)
}


/**
 * Checks for filename presence at command line. 
 * A filename is considered to be the last argument in the command line argument list.
 * Runs success function, if fileName is present. 
 * Runs help function otherwise. 
 *   You can provide a string instead of a help function. 
 *   In that case, a simple "Usage" help, with that string will be printed to the output.
 * 
 * @param {array} argv 
 * @param {string | fuction(appName: string)} help
 * @param {function(fileName: string)} success 
 */

const runCmdLineHelper = (argv, help, success) => {
    const appName = path.basename(argv[1])
    const fileName = argv.length > 2 ?
        argv[argv.length - 1]
        : null
    fileName ?
        success(fileName)
        : typeof (help) === 'string'
            ? _defaultHelp(appName, help)
            : help(appName)
}

/**
 * Default error-handling function. Just prints the error message.
 */
const stdOutErrorHandler = error => console.log(`ERROR: ${error.message}`)

/**
 * Verbose error-handling function. Prints the error.
 */
const stdOutVerboseErrorHandler = error => console.log(`ERROR: ${error.message}\n`, error)


/**
 * An identity function. Returns its input unchanged. Useful in functional composition.
 * 
 * identity :: a -> a
 */
const identity = a => a

//------------------------------------------------------------------------------

module.exports = {
    
    /**
     * just a Task from data.task module, for convenience
     */
    Task,

    /**
     * streamFromFileNameTask :: (string -> readStreamOptions) -> Task Error Stream
     */
    streamFromFileNameTask,

    /**
     * Returns an Observable of text lines.
     * 
     * lineObservableFromStream :: stream -> Task Error Observable
     * 
     * @param {Stream} stream 
     */
    lineObservableFromStream,
    
    /**
     * Checks for filename presence at command line. 
     * A filename is considered to be the last argument in the command line argument list.
     * Runs success function, if fileName is present. 
     * Runs help function otherwise. 
     *   You can provide a string instead of a help function. 
     *   In that case, a simple "Usage" help, with that string will be printed to the output.
     * 
     * @param {array} argv 
     * @param {string | fuction(appName: string)} help
     * @param {function(fileName: string)} success 
     */
    runCmdLineHelper,
    
    /**
     * Default error-handling function. Just prints the error message and details
     */
    stdOutErrorHandler,

    /**
     * Verbose error-handling function. Prints the error.
     */
    stdOutVerboseErrorHandler,

    /**
     * An identity function. Returns its input unchanged. 
     * 
     * identity :: a -> a
     */
    identity,
}
