/** @format */

import Imbed from "core/Imbed"
import { asynclib } from "utils/common"

function getOptions(inputOptions) {
    let options = {}
    let captured = false
    for (let key of ["height", "width", "fit"]) {
        if (inputOptions[key] === undefined) continue
        options[key] = inputOptions[key]
        captured = true
    }
    return [options, captured]
}

async function handle(ctx: Imbed) {
    await asynclib.M(ctx.output).all(async (item) => {
        if (item.buffer === undefined || !item.input.options) return
        let [options, captured] = getOptions(item.input.options)
        if (!captured) return
        options = Object.assign({ fit: "contain" }, item.input.options)
        item.buffer = await ctx.deps.get("sharp")(item.buffer).resize(options).toBuffer()
    })
}

export default { handle }
