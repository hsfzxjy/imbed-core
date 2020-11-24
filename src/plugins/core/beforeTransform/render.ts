/** @format */

import Imbed from "core/Imbed"
import { asynclib } from "utils/common"
import consts from "./consts"
import getStdin from "get-stdin"

consts.SPECIAL_SOURCES.add("stdin")

export default {
    name: "render",
    deps: ["normalize"],
    async handle(ctx: Imbed) {
        if (!ctx.hooks.transformer.has("render")) return
        await asynclib.M(ctx.input).all(async (item) => {
            item.stdin = item.source.src === "stdin"
            if (!item.stdin) return
            if (ctx.input.length !== 1) {
                throw Error("More than one job specified when using stdin")
            }

            item.source.src = await getStdin()
        })
    },
}
