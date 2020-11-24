/** @format */

import request from "request"
import requestPromise from "request-promise-native"
import fs from "fs-extra"
import path from "path"

import { imageSize } from "image-size"
import { IImageInfo } from "./interfaces"
import { URL as _URL } from "url"

import dayjs from "dayjs"

export namespace urllib {
    export function is(url: string): boolean {
        return url.startsWith("http://") || url.startsWith("https://")
    }

    export function isEncoded(url: string): boolean {
        url = url || ""
        try {
            return url !== decodeURI(url)
        } catch (e) {
            return true
        }
    }

    export function encode(url: string): string {
        if (!isEncoded(url)) {
            url = encodeURI(url)
        }
        return url
    }

    export const URL = _URL
}

export namespace asynclib {
    export class TimeoutError extends Error {}

    export function timeout<T>(f: Promise<T>, timeout: number, msg?: string): Promise<T>
    export function timeout<T>(f: () => Promise<T>, timeout: number, msg?: string): Promise<T>
    export function timeout<T>(f: any, timeout: number, msg?: string): Promise<T> {
        let timeoutId: NodeJS.Timeout
        const timeoutPromise = new Promise<T>((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new TimeoutError(msg ?? "Timeout"))
            }, timeout)
        })
        const promise = typeof f === "function" ? f() : f
        return Promise.race([
            timeoutPromise,
            promise.finally(() => {
                clearTimeout(timeoutId)
            }),
        ])
    }

    type MapCallback<T, U> = (value: T, index: number, array: T[]) => U
    interface Mappable<T> {
        map<U>(callbackfn: MapCallback<T, U>, thisArg?: any): U[]
    }

    export function M<T>(array: Mappable<T>) {
        return {
            seqEach(mapper: MapCallback<T, Promise<void>>): Promise<void> {
                return seq(array.map((...args) => () => mapper(...args)))
            },
            all<U>(mapper: MapCallback<T, Promise<U>>): Promise<U[]> {
                return Promise.all(array.map(mapper))
            },
            race<U>(mapper: MapCallback<T, Promise<U>>): Promise<U> {
                return Promise.race(array.map(mapper))
            },
        }
    }

    export async function seq(tasks: (() => Promise<void>)[]): Promise<void> {
        for (const task of tasks) {
            await task()
        }
    }

    export class Defered<T> {
        promise!: Promise<T>
        resolve: Function
        reject: Function

        constructor() {
            this.reset()
        }

        reset() {
            this.promise = new Promise((resolve, reject) => {
                this.resolve = resolve
                this.reject = reject
            })
        }
    }

    export function sleep(ms: number): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(() => resolve(), ms)
        })
    }
}

export namespace imagelib {
    interface IImageSize {
        height?: number
        width?: number
    }

    export function getSize(file: Buffer): IImageSize {
        const { width, height } = imageSize(file)
        return {
            width,
            height,
        }
    }

    export async function load(source: string): Promise<IImageInfo> {
        if (urllib.is(source)) {
            return await fromWeb(source)
        } else {
            return await fromLocal(source)
        }
    }

    async function fromLocal(filePath: string): Promise<IImageInfo> {
        return {
            extname: path.extname(filePath),
            fileName: path.basename(filePath),
            buffer: await fs.readFile(filePath),
        }
    }

    function fromWeb(url: string, timeout?: number): Promise<IImageInfo> {
        const requestOptions = {
            method: "GET",
            url,
            encoding: null,
        }

        return asynclib.timeout(async () => {
            let extname = ""
            let isImage = false
            const res = await requestPromise(requestOptions) //
                .on("response", (response: request.Response): void => {
                    const contentType = response.headers["content-type"]
                    if (contentType?.includes("image")) {
                        isImage = true
                        extname = `.${contentType.split("image/")[1]}`
                    }
                })
            if (isImage) {
                const urlPath = new urllib.URL(requestOptions.url).pathname
                return {
                    buffer: res,
                    fileName: path.basename(urlPath),
                    extname,
                }
            } else {
                throw new Error(`${url} is not an image`)
            }
        }, timeout ?? 10000)
    }
}

export namespace fslib {
    export function makeTimestampFilename(ext: string) {
        return dayjs().format("YYYY-MM-DD-HH-mm-ss-SSS") + ext
    }
}
