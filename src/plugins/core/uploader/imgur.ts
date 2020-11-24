/** @format */

import Imbed from "core/Imbed"
import { IHookOptionsItem, RequestOptions } from "utils/interfaces"

export interface IImgurConfig {
    clientId: string
    proxy: string
}

function requestOptions(options: IImgurConfig, fileName: string, imgBase64: string): RequestOptions {
    const clientId = options.clientId
    const obj: RequestOptions = {
        method: "POST",
        url: "https://api.imgur.com/3/image",
        headers: {
            Authorization: `Client-ID ${clientId}`,
            "content-type": "multipart/form-data",
            "User-Agent": "Imbed",
        },
        formData: {
            image: imgBase64,
            type: "base64",
            name: fileName,
        },
    }
    if (options.proxy) {
        obj.proxy = options.proxy
    }
    return obj
}

async function handle(ctx: Imbed): Promise<Imbed> {
    const imgurOptions = ctx.cfg.get<IImgurConfig>("transformer.imgur")
    if (!imgurOptions) {
        throw new Error("Can't find imgur config")
    }
    const imgList = ctx.output
    for (const img of imgList) {
        if (!img.fileName || !img.buffer) continue
        const base64Image = Buffer.from(img.buffer).toString("base64")
        const options = requestOptions(imgurOptions, img.fileName, base64Image)
        let body = await ctx.client(options)
        body = JSON.parse(body)
        if (body.success) {
            delete img.base64Image
            delete img.buffer
            img.imgUrl = body.data.link
        } else {
            throw new Error("Server error, please try again")
        }
    }
    return ctx
}

function config(ctx: Imbed): IHookOptionsItem[] {
    const userConfig = ctx.cfg.get<IImgurConfig>("transformer.imgur") || {}
    const config = [
        {
            name: "clientId",
            type: "input",
            default: userConfig.clientId || "",
            required: true,
        },
        {
            name: "proxy",
            type: "input",
            default: userConfig.proxy || "",
            required: false,
        },
    ]
    return config
}

export default {
    name: "Imgur图床",
    handle,
    config,
}
