const path = require('path')
const fs = require('fs')
const tsconfig = require('../tsconfig.json')
const glob = require('globby')

const projectDir = path.join(path.dirname(__filename), '..')
const outDir = path.resolve(path.join(projectDir, tsconfig.compilerOptions.outDir, 'src'))
const subDirectories = getSubDirectories()

function getSubDirectories() {
    return new Set(
        fs.readdirSync(outDir)
            .filter(
                x => fs
                    .lstatSync(path.join(outDir, x))
                    .isDirectory()
            )
    )
}

function processFile(filename, pattern) {
    let n = 0
    let dirname = path.resolve(path.dirname(filename))

    while (dirname !== outDir) {
        n++
        dirname = path.resolve(path.join(dirname, '..'))
    }
    const prefix = '../'.repeat(n)

    let content = fs.readFileSync(filename).toString()
    content = content.replace(pattern, (modName) => {
        if (!subDirectories.has(modName.split('/')[0])) return modName
        return prefix + modName
    })
    fs.writeFileSync(filename, content)
}

async function main() {
    const patterns = [
        [/\.d\.ts$/, /(?<=import[\s\S]+?from\s+["']).+?(?=["'].+?\s*[\n$])/gm],
        [/\.js$/, /(?<=require\(['"]).+?(?=['"]\))/gm]
    ]
    let filenames = await glob(path.join(outDir, '**', '*'))
    filenames.map(filename => {
        for (let [extname, pattern] of patterns) {
            if (extname.test(filename)) {
                processFile(filename, pattern)
                break
            }
        }
    })
}

main().catch(e => { throw e })