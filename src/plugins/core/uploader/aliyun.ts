/** @format */

import Imbed from "core/Imbed"
import { IHookOptionsItem, RequestOptions } from "utils/interfaces"
import crypto from "crypto"
import mime from "mime-types"

export interface IAliyunConfig {
    accessKeyId: string
    accessKeySecret: string
    bucket: string
    area: string
    path: string
    customUrl: string
    options: string
}

// generate OSS signature
function generateSignature(options: IAliyunConfig, fileName: string): string {
    const date = new Date().toUTCString()
    const mimeType = mime.lookup(fileName)
    if (!mimeType) throw Error(`No mime type found for file ${fileName}`)

    const signString = `PUT\n\n${mimeType}\n${date}\n/${options.bucket}/${options.path}${fileName}`

    const signature = crypto.createHmac("sha1", options.accessKeySecret).update(signString).digest("base64")
    return `OSS ${options.accessKeyId}:${signature}`
}

function requestOptions(options: IAliyunConfig, fileName: string, signature: string, image: Buffer): RequestOptions {
    return {
        method: "PUT",
        url: `https://${options.bucket}.${options.area}.aliyuncs.com/${encodeURI(options.path)}${encodeURI(fileName)}`,
        headers: {
            Host: `${options.bucket}.${options.area}.aliyuncs.com`,
            Authorization: signature,
            Date: new Date().toUTCString(),
            "content-type": mime.lookup(fileName),
        },
        body: image,
        json: true,
    }
}

async function handle(ctx: Imbed): Promise<Imbed> {
    const aliYunOptions = ctx.cfg.get<IAliyunConfig>("transformer.aliyun")
    if (!aliYunOptions) {
        throw new Error("Can't find aliYun OSS config")
    }
    const imgList = ctx.output
    const customUrl = aliYunOptions.customUrl
    const path = aliYunOptions.path
    for (const img of imgList) {
        if (!img.fileName || !img.buffer) continue
        const signature = generateSignature(aliYunOptions, img.fileName)
        let image = img.buffer
        const options = requestOptions(aliYunOptions, img.fileName, signature, image)
        const body = await ctx.client(options)
        if (body.statusCode === 200) {
            delete img.base64Image
            delete img.buffer
            const optionUrl = aliYunOptions.options || ""
            if (customUrl) {
                img.imgUrl = `${customUrl}/${path}${img.fileName}${optionUrl}`
            } else {
                img.imgUrl = `https://${aliYunOptions.bucket}.${aliYunOptions.area}.aliyuncs.com/${path}${img.fileName}${optionUrl}`
            }
        } else {
            throw new Error("Upload failed")
        }
    }
    return ctx
}

function config(ctx: Imbed): IHookOptionsItem[] {
    const userConfig = ctx.cfg.get<IAliyunConfig>("transformer.aliyun") || {}
    const config = [
        {
            name: "accessKeyId",
            type: "input",
            default: userConfig.accessKeyId || "",
            required: true,
        },
        {
            name: "accessKeySecret",
            type: "input",
            default: userConfig.accessKeySecret || "",
            required: true,
        },
        {
            name: "bucket",
            type: "input",
            default: userConfig.bucket || "",
            required: true,
        },
        {
            name: "area",
            type: "input",
            default: userConfig.area || "",
            required: true,
        },
        {
            name: "path",
            type: "input",
            default: userConfig.path || "",
            required: false,
        },
        {
            name: "customUrl",
            type: "input",
            default: userConfig.customUrl || "",
            required: false,
        },
        {
            name: "options",
            type: "input",
            default: userConfig.options || "",
            required: false,
        },
    ]
    return config
}

export default {
    name: "阿里云OSS",
    handle,
    config,
}
