
const basePath = process.argv[2] || '.'
const finder = require('findit')(basePath);
const path = require('path');

finder.on('directory', function (dir, stat, stop, linkPath) {
    const base = path.basename(dir);
    if (base === '.git' || base === 'node_modules') {
        stop()
    } // else console.log(dir + '/')
});

finder.on('file', function (file, stat, linkPath) {
    if (path.extname(file).toLowerCase() === '.js') {
        console.log(file);
    }
});

// finder.on('link', function (link, stat) {
//     console.log(link);
// });