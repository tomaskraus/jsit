const readline = require('readline');


const processLine = (line) => {
    console.log(`* Received: ${line}`);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
rl.on('line', processLine)

