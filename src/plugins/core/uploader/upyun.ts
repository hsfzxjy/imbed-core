/** @format */

import Imbed from "core/Imbed"
import { IHookOptionsItem } from "utils/interfaces"
import crypto from "crypto"
import MD5 from "md5"
import { Options } from "request-promise-native"

interface IUpyunConfig {
    /** 存储空间名，及你的服务名 */
    bucket: string
    /** 操作员 */
    operator: string
    /** 密码 */
    password: string
    /** 针对图片的一些后缀处理参数 */
    options: string
    /** 自定义存储路径，比如 `img/` */
    path: string
    /** 加速域名，注意要加 `http://` 或者 `https://` */
    url: string
}

// generate COS signature string
function generateSignature(options: IUpyunConfig, fileName: string): string {
    const path = options.path || ""
    const operator = options.operator
    const password = options.password
    const md5Password = MD5(password)
    const date = new Date().toUTCString()
    const uri = `/${options.bucket}/${encodeURI(path)}${encodeURI(fileName)}`
    const value = `PUT&${uri}&${date}`
    const sign = crypto.createHmac("sha1", md5Password).update(value).digest("base64")
    return `UPYUN ${operator}:${sign}`
}

function requestOptions(options: IUpyunConfig, fileName: string, signature: string, image: Buffer): Options {
    const bucket = options.bucket
    const path = options.path || ""
    return {
        method: "PUT",
        url: `https://v0.api.upyun.com/${bucket}/${encodeURI(path)}${encodeURI(fileName)}`,
        headers: {
            Authorization: signature,
            Date: new Date().toUTCString(),
        },
        body: image,
        resolveWithFullResponse: true,
    }
}

async function handle(ctx: Imbed): Promise<Imbed> {
    const upyunOptions = ctx.cfg.get<IUpyunConfig>("transformer.upyun")
    if (!upyunOptions) {
        throw new Error("Can't find upYun config")
    }
    const imgList = ctx.output
    const path = upyunOptions.path || ""
    for (const img of imgList) {
        if (!img.fileName || !img.buffer) continue
        let image = img.buffer
        const signature = generateSignature(upyunOptions, img.fileName)
        const options = requestOptions(upyunOptions, img.fileName, signature, image)
        const body = await ctx.client(options)
        if (body.statusCode === 200) {
            delete img.base64Image
            delete img.buffer
            img.imgUrl = `${upyunOptions.url}/${path}${img.fileName}${upyunOptions.options}`
        } else {
            throw new Error("Upload failed")
        }
    }
    return ctx
}

function config(ctx: Imbed): IHookOptionsItem[] {
    const userConfig = ctx.cfg.get<IUpyunConfig>("transformer.upyun") || {}
    const config = [
        {
            name: "bucket",
            type: "input",
            default: userConfig.bucket || "",
            required: true,
        },
        {
            name: "operator",
            type: "input",
            default: userConfig.operator || "",
            required: true,
        },
        {
            name: "password",
            type: "password",
            default: userConfig.password || "",
            required: true,
        },
        {
            name: "url",
            type: "input",
            default: userConfig.url || "",
            required: true,
        },
        {
            name: "options",
            type: "input",
            default: userConfig.options || "",
            required: true,
        },
        {
            name: "path",
            type: "input",
            default: userConfig.path || "",
            required: false,
        },
    ]
    return config
}

export default {
    name: "又拍云图床",
    handle,
    config,
}
