/** @format */

import Imbed from "core/Imbed"

async function handle(ctx: Imbed): Promise<Imbed> {
    ctx.output.push(...ctx.input)
    ctx.input.forEach((item, index) => {
        ctx.output[index].buffer = Buffer.from(item.src, "base64")
        ctx.output[index].fileName = item.dest
    })
    return ctx
}

export default {
    handle,
}
