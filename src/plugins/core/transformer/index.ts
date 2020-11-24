/** @format */

import Imbed from "core/Imbed"
import ImgFromPath from "./path"
import ImgFromBase64 from "./base64"
import Minify from "./minify"
import Render from "./render"

export default (ctx: Imbed): void => {
    ctx.hooks.transformer.register("path", ImgFromPath)
    ctx.hooks.transformer.register("base64", ImgFromBase64)
    ctx.hooks.transformer.register("minify", Minify)
    ctx.hooks.transformer.register("render", Render)
}
