import PicGo from '../core/PicGo'
import path from 'path'
import { spawn } from 'child_process'
import dayjs from 'dayjs'

// Thanks to vs-picgo: https://github.com/Spades-S/vs-picgo/blob/master/src/extension.ts
const getClipboardImage = (ctx: PicGo): Promise<any> => {
  const imagePath = path.join(ctx.baseDir, `${dayjs().format('YYYYMMDDHHmmss')}.png`)
  return new Promise((resolve: any, reject: any): any => {
    let platform: string = process.platform
    let execution = null
    // for PicGo GUI
    let env = ctx.config.PICGO_ENV === 'GUI'
    const platformPaths: {
      [index: string]: string
    } = {
      'darwin': env ? path.join(ctx.baseDir,'./mac.applescript') : './clipboard/mac.applescript',
      'win32': env ? path.join(ctx.baseDir, 'windows.ps1') : './clipboard/windows.ps1',
      'linux': env ? path.join(ctx.baseDir, 'linux.sh') : './clipboard/linux.sh'
    }
    const scriptPath = env ? platformPaths[platform] : path.join(__dirname, platformPaths[platform])
    if (platform === 'darwin') {
      execution = spawn('osascript', [scriptPath, imagePath])

    } else if (platform === 'win32') {
      execution = spawn('powershell', [
        '-noprofile',
        '-noninteractive',
        '-nologo',
        '-sta',
        '-executionpolicy', 'unrestricted',
        '-windowstyle', 'hidden',
        '-file', scriptPath,
        imagePath
      ])
    } else {
      execution = spawn('sh', [scriptPath, imagePath])
    }

    execution.stdout.on('data', (data: Buffer) => {
      if (platform === 'linux') {
        if (data.toString().trim() === 'no xclip') {
          return ctx.emit('notification', {
            title: 'xclip not found',
            body: 'Please install xclip before run picgo!'
          })
        }
      }
      let imgPath = data.toString().trim()
      let isExistFile = false
      // in macOS if your copy the file in system, it's basename will not equal to our default basename
      if (path.basename(imgPath) !== path.basename(imagePath)) {
        isExistFile = true
      }
      resolve({
        imgPath,
        isExistFile
      })
    })
    execution.stderr.on('data', (err: any) => {
      reject(err)
    })
  })
}

export default getClipboardImage
