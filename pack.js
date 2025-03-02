const {exec} = require('pkg')
const projectPackageJson = require('./package.json')
exec([".", "-C", "brotli", "--output", `./${projectPackageJson.pkg.outputPath}/${projectPackageJson.name}-${projectPackageJson.version}.exe`])