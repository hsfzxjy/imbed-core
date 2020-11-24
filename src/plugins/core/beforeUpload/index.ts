/** @format */

import Imbed from "core/Imbed"
import { imagelib } from "utils/common"

const getImageSize = {
    handle(ctx: Imbed) {
        ctx.output.forEach((item) => {
            if (!item.buffer) return
            Object.assign(item, imagelib.getSize(item.buffer))
        })
    },
}

export default function (ctx: Imbed) {
    ctx.hooks.beforeUpload.register("imgsize", getImageSize)
}
