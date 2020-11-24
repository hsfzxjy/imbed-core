/** @format */

import Imbed from "core/Imbed"
import { asynclib, imagelib } from "utils/common"
import { except } from "utils/except"
import { IImageInfo } from "utils/interfaces"

async function handle(ctx: Imbed): Promise<Imbed> {
    const results: IImageInfo[] = ctx.output
    await asynclib.M(ctx.input).all(async (item: any, index: number) => {
        if (!item.source.src || results[index].buffer) return

        await except().do(async () => {
            const info = await imagelib.load(item.source.src)
            Object.assign(results[index], {
                buffer: info.buffer,
                fileName: item.source.dest || info.fileName,
                extname: info.extname,
            })
        })
    })

    // remove empty item
    ctx.output = results.filter((item) => item)
    return ctx
}

export default {
    handle,
}
