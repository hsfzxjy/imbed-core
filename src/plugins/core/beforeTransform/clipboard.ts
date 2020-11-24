/** @format */

import fs from "fs-extra"
import Imbed from "core/Imbed"
import getClipboardImage from "utils/getClipboardImage"
import { asynclib } from "utils/common"
import consts from "./consts"
consts.SPECIAL_SOURCES.add("clip")

export default {
    name: "clipboard",
    deps: ["normalize"],
    async handle(ctx: Imbed) {
        await asynclib.M(ctx.input).all(async (item) => {
            item.clipboard = item.source.src === "clip"
            if (!item.clipboard) return
            const imgPath = await getClipboardImage(ctx)
            if (imgPath === undefined) {
                item.source.src = ""
                ctx.emit("empty-clip")
                return
            }
            item.source.src = imgPath

            ctx.finally(() => {
                fs.remove(imgPath).catch((e) => ctx.log.error(e))
            })
        })
    },
}
