/** @format */

import Imbed from "core/Imbed"
import { IHookOptionsItem, RequestOptions } from "utils/interfaces"

export interface IGithubConfig {
    repo: string
    token: string
    path: string
    customUrl: string
    branch: string
}

function requestOptions(fileName: string, options: IGithubConfig, data: any): RequestOptions {
    const path = options.path || ""
    const { token, repo } = options
    return {
        method: "PUT",
        url: `https://api.github.com/repos/${repo}/contents/${encodeURI(path)}${encodeURI(fileName)}`,
        headers: {
            Authorization: `token ${token}`,
            "User-Agent": "Imbed",
        },
        body: data,
        resolveWithFullResponse: true,
    }
}

async function handle(ctx: Imbed): Promise<Imbed> {
    const githubOptions = ctx.cfg.get<IGithubConfig>("transformer.github")
    if (!githubOptions) {
        throw new Error("Can't find github config")
    }
    const imgList = ctx.output
    for (const img of imgList) {
        if (!img.fileName || !img.buffer) continue
        const base64Image = Buffer.from(img.buffer).toString("base64")
        const data = {
            message: "Upload by Imbed",
            branch: githubOptions.branch,
            content: base64Image,
            path: githubOptions.path + encodeURI(img.fileName),
        }
        const postConfig = requestOptions(img.fileName, githubOptions, data)
        const body = await ctx.client(postConfig)
        if (body) {
            delete img.base64Image
            delete img.buffer
            if (githubOptions.customUrl) {
                img.imgUrl = `${githubOptions.customUrl}/${githubOptions.path}${img.fileName}`
            } else {
                img.imgUrl = body.data.download_url
            }
        } else {
            throw new Error("Server error, please try again")
        }
    }
    return ctx
}

function config(ctx: Imbed): IHookOptionsItem[] {
    const userConfig = ctx.cfg.get<IGithubConfig>("transformer.github") || {}
    const config = [
        {
            name: "repo",
            type: "input",
            default: userConfig.repo || "",
            required: true,
        },
        {
            name: "branch",
            type: "input",
            default: userConfig.branch || "master",
            required: true,
        },
        {
            name: "token",
            type: "input",
            default: userConfig.token || "",
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

export default {
    name: "GitHub图床",
    handle,
    config,
}
