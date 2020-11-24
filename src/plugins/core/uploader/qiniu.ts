/** @format */

import Imbed from "core/Imbed"
import qiniu from "qiniu"
import { IHookOptionsItem } from "utils/interfaces"
import { Options } from "request-promise-native"

interface IQiniuConfig {
    accessKey: string
    secretKey: string
    bucket: string
    url: string
    area: "z0" | "z1" | "z2" | "na0" | "as0"
    options: string
    path: string
}

function requestOptions(options: IQiniuConfig, fileName: string, token: string, imgBase64: string): Options {
    const area = selectArea(options.area || "z0")
    const path = options.path || ""
    const base64FileName = Buffer.from(path + fileName, "utf-8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
    return {
        method: "POST",
        url: `http://upload${area}.qiniu.com/putb64/-1/key/${base64FileName}`,
        headers: {
            Authorization: `UpToken ${token}`,
            contentType: "application/octet-stream",
        },
        body: imgBase64,
    }
}

function selectArea(area: string): string {
    return area === "z0" ? "" : "-" + area
}

function getToken(qiniuOptions: any): string {
    const accessKey = qiniuOptions.accessKey
    const secretKey = qiniuOptions.secretKey
    const mac = new qiniu.auth.digest.Mac(accessKey, secretKey)
    const options = {
        scope: qiniuOptions.bucket,
    }
    const putPolicy = new qiniu.rs.PutPolicy(options)
    return putPolicy.uploadToken(mac)
}

async function handle(ctx: Imbed): Promise<Imbed> {
    const qiniuOptions = ctx.cfg.get<IQiniuConfig>("transformer.qiniu")
    if (!qiniuOptions) {
        throw new Error("Can't find qiniu config")
    }
    const imgList = ctx.output
    for (const img of imgList) {
        if (!img.fileName || !img.buffer) continue
        const base64Image = Buffer.from(img.buffer).toString("base64")
        const options = requestOptions(qiniuOptions, img.fileName, getToken(qiniuOptions), base64Image)
        const res = await ctx.client(options)
        const body = JSON.parse(res)
        if (body?.key) {
            delete img.base64Image
            delete img.buffer
            const baseUrl = qiniuOptions.url
            const options = qiniuOptions.options
            img.imgUrl = `${baseUrl}/${body.key as string}${options}`
        } else {
            ctx.emit("notification", {
                title: "上传失败",
                body: res.body.msg,
            })
            throw new Error("Upload failed")
        }
    }
    return ctx
}

function config(ctx: Imbed): IHookOptionsItem[] {
    const userConfig = ctx.cfg.get<IQiniuConfig>("transformer.qiniu") || {}
    const config = [
        {
            name: "accessKey",
            type: "input",
            default: userConfig.accessKey || "",
            required: true,
        },
        {
            name: "secretKey",
            type: "input",
            default: userConfig.secretKey || "",
            required: true,
        },
        {
            name: "bucket",
            type: "input",
            default: userConfig.bucket || "",
            required: true,
        },
        {
            name: "url",
            type: "input",
            default: userConfig.url || "",
            required: true,
        },
        {
            name: "area",
            type: "input",
            default: userConfig.area || "",
            required: true,
        },
        {
            name: "options",
            type: "input",
            default: userConfig.options || "",
            required: false,
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
    name: "七牛图床",
    handle,
    config,
}
