/** @format */

import Imbed from "core/Imbed"
import crypto from "crypto"
import mime from "mime-types"
import { IHookOptionsItem, ISuggestionOptions, ISuggestionResult } from "utils/interfaces"
import { Options } from "request-promise-native"
import qs from "querystring"
import path from "path"
import xml2js from "xml2js"

// generate COS signature string

interface ISignature {
    signature: string
    appId: string
    bucket: string
    signTime: string
    host: string
    url: string
    urlParamList: string
}

interface ITcyunConfig {
    secretId: string
    secretKey: string

    bucket: string
    appId: string
    area: string
    path: string
    customUrl: string
}

function encodeQueryString(params?: Object): { query: string; urlParamList: string } {
    params = params ?? {}
    const paramKeys = Object.keys(params)
        .filter((key) => params![key] !== undefined)
        .sort()
    return {
        urlParamList: paramKeys.join(";"),
        query: paramKeys
            .map((key) => {
                const value = params![key]
                return qs.escape(key) + "=" + qs.escape(value)
            })
            .join("&"),
    }
}

function generateSignature(options: ITcyunConfig, method: string, path: string, params?: Object): ISignature {
    const secretKey = options.secretKey
    const appId = options.appId
    const bucket = options.bucket
    const host = `${options.bucket}.cos.${options.area}.myqcloud.com`
    let signature: string
    let signTime: string = ""

    // https://cloud.tencent.com/document/product/436/7778#signature
    const today = Math.floor(new Date().getTime() / 1000)
    const tomorrow = today + 86400
    signTime = `${today};${tomorrow}`
    const signKey = crypto //
        .createHmac("sha1", secretKey)
        .update(signTime)
        .digest("hex")

    path = options.path + path
    if (!path.startsWith("/")) path = "/" + path

    const qopts = encodeQueryString(params)

    const httpString = [
        //
        method.toLowerCase(),
        path,
        qopts.query,
        `host=${host}`,
        "",
    ].join("\n")

    const sha1edHttpString = crypto.createHash("sha1").update(httpString).digest("hex")
    const stringToSign = `sha1\n${signTime}\n${sha1edHttpString}\n`
    signature = crypto.createHmac("sha1", signKey).update(stringToSign).digest("hex")

    return {
        signature,
        appId,
        bucket,
        signTime,
        host,
        url: `https://${host}${path}` + "?" + qopts.query,
        urlParamList: qopts.urlParamList,
    }
}

function requestOptions(options: ITcyunConfig, method: string, uri_path: string, params?: Object, body?: any): Options {
    const signature = generateSignature(options, method, uri_path, params)

    return {
        method: method.toUpperCase(),
        url: signature.url,
        headers: {
            Host: signature.host,
            Authorization: `q-sign-algorithm=sha1&q-ak=${options.secretId}&q-sign-time=${signature.signTime}&q-key-time=${signature.signTime}&q-header-list=host&q-url-param-list=${signature.urlParamList}&q-signature=${signature.signature}`,
            contentType: mime.lookup(path.basename(uri_path)),
        },
        body,
        resolveWithFullResponse: true,
    }
}

async function handle(ctx: Imbed): Promise<Imbed | boolean> {
    const tcYunOptions = ctx.cfg.get<ITcyunConfig>("transformer.tcyun")
    if (!tcYunOptions) {
        throw new Error("Can't find tencent COS config")
    }
    const imgList = ctx.output
    const path = tcYunOptions.path
    const forceUpload = ctx.cfg.get<any>("render.options").forceUpload

    for (const img of imgList) {
        if (!img.fileName || !img.buffer) continue
        if (!forceUpload && !img.needsUpload) {
            img.imgUrl = getObjectUrl(tcYunOptions, path + img.fileName)
            ctx.log.debug(`Soft upload - ${img.imgUrl}`)
            continue
        }
        let image = img.buffer
        const options = requestOptions(tcYunOptions, "put", img.fileName, {}, image)

        const res = await ctx
            .client(options)
            .then((res: any) => res)
            .catch((err: Error) => {
                console.log(err)
                return {
                    statusCode: 400,
                    body: {
                        msg: "认证失败！",
                    },
                }
            })
        let body = res
        if (body.statusCode === 400) {
            throw new Error("Upload failed")
        }
        if (body?.statusCode === 200) {
            img.imgUrl = getObjectUrl(tcYunOptions, path + img.fileName)
        } else {
            throw new Error("Upload failed")
        }
    }
    return ctx
}

function getObjectUrl(tcYunOptions: ITcyunConfig, path: string): string {
    const customUrl = tcYunOptions.customUrl

    if (customUrl) {
        return `${customUrl}/${path}`
    } else {
        return `https://${tcYunOptions.bucket}.cos.${tcYunOptions.area}.myqcloud.com${path}`
    }
}

function config(ctx: Imbed): IHookOptionsItem[] {
    const userConfig = ctx.cfg.get<ITcyunConfig>("transformer.tcyun") || {}
    const config = [
        {
            name: "secretId",
            type: "input",
            default: userConfig.secretId || "",
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
            name: "appId",
            type: "input",
            default: userConfig.appId || "",
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
    ]
    return config
}

async function suggest(ctx: Imbed, opts: ISuggestionOptions): Promise<ISuggestionResult> {
    const tcYunOptions = ctx.cfg.get<ITcyunConfig>("transformer.tcyun")
    if (!tcYunOptions) {
        throw new Error("Can't find tencent COS config")
    }

    const response = await ctx
        .client(requestOptions(tcYunOptions, "get", "", opts))
        .then((response) => xml2js.parseStringPromise(response.body))

    if (response.Error) {
        throw new Error(response.Error.Message[0])
    }

    const results = (response.ListBucketResult.Contents ?? []).map((item) => {
        const name = item.Key[0]
        return { name, url: getObjectUrl(tcYunOptions, name) }
    })

    return {
        results,
        truncated: response.ListBucketResult.IsTruncated[0] === "true",
    }
}

export default {
    name: "腾讯云COS",
    handle,
    config,
    suggest,
    supportSoftUpload: true,
}
