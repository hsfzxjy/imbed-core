/** @format */

import Imbed from "core/Imbed"
import SMMSUploader from "./smms"
import tcYunUploader from "./tcyun"
import githubUploader from "./github"
import qiniuUploader from "./qiniu"
import imgurUploader from "./imgur"
import aliYunUploader from "./aliyun"
import upYunUploader from "./upyun"

export default (ctx: Imbed): void => {
    ctx.hooks.uploader.register("smms", SMMSUploader)
    ctx.hooks.uploader.register("tcyun", tcYunUploader)
    ctx.hooks.uploader.register("github", githubUploader)
    ctx.hooks.uploader.register("qiniu", qiniuUploader)
    ctx.hooks.uploader.register("imgur", imgurUploader)
    ctx.hooks.uploader.register("aliyun", aliYunUploader)
    ctx.hooks.uploader.register("upyun", upYunUploader)
}
