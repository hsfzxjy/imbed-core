/** @format */

import Imbed from "core/Imbed"
import { IHookOptionsItem } from "utils/interfaces"
import { Options } from "request-promise-native"

interface ISmmsConfig {
    token: string
}

function requestOptions(fileName: string, image: Buffer, apiToken: string): Options {
    return {
        method: "POST",
        url: "https://sm.ms/api/v2/upload",
        headers: {
            contentType: "multipart/form-data",
            "User-Agent": "Imbed",
            Authorization: apiToken,
        },
        formData: {
            smfile: {
                value: image,
                options: {
                    filename: fileName,
                },
            },
            ssl: "true",
        },
    }
}

async function handle(ctx: Imbed): Promise<Imbed> {
    const smmsConfig = ctx.cfg.get<ISmmsConfig>("transformer.smms")
    if (!smmsConfig) {
        throw new Error("Can't find smms config, please provide api token, see https://sm.ms/home/apitoken")
    }
    const imgList = ctx.output
    for (const img of imgList) {
        if (!img.fileName || !img.buffer) continue
        let image = img.buffer
        const postConfig = requestOptions(img.fileName, image, smmsConfig.token)
        let body = await ctx.client(postConfig)
        body = JSON.parse(body)
        if (body.code === "success") {
            delete img.base64Image
            delete img.buffer
            img.imgUrl = body.data.url
        } else if (body.code === "image_repeated" && typeof body.images === "string") {
            // do extra check since this error return is not documented at https://doc.sm.ms/#api-Image-Upload
            delete img.base64Image
            delete img.buffer
            img.imgUrl = body.images
        } else {
            throw new Error()
        }
    }
    return ctx
}

function config(ctx: Imbed): IHookOptionsItem[] {
    const userConfig = ctx.cfg.get<ISmmsConfig>("transformer.smms") || {}
    const config = [
        {
            name: "token",
            message: "api token",
            type: "input",
            default: userConfig.token || "",
            required: true,
        },
    ]
    return config
}

export default {
    name: "SM.MS图床",
    handle,
    config,
}
