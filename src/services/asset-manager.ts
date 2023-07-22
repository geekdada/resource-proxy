import { extname, basename } from 'node:path'
import got from 'got'
import { join } from 'node:path'
import fs, { ReadStream } from 'fs-extra'
import probe from 'probe-image-size'
import micromatch from 'micromatch'
import boom from '@hapi/boom'
import dayjs from 'dayjs'

import { AssetState } from '../constants/asset.js'
import { tempDir, upstreamWhiteList } from '../libs/config.js'
import { getETagFromBuffer, getSHA1 } from '../libs/hash.js'
import { serverLogger } from '../libs/logger.js'
import { getObject, putObject } from '../libs/s3.js'
import { Asset } from '../models/index.js'

interface InitResult {
  assetState: AssetState
  asset?: ReadStream | Buffer
  assetFileHash?: string
  mime?: string
}

class AssetManager {
  public aid: string
  public hasInit = false

  constructor(private assetURL: URL) {
    const { searchParams } = assetURL

    if (searchParams.has('table') && searchParams.has('id')) {
      this.aid = getSHA1(
        this.assetURL.origin +
          this.assetURL.pathname +
          searchParams.get('table') +
          searchParams.get('id')
      )
    }
    {
      this.aid = getSHA1(this.assetURL.origin + this.assetURL.pathname)
    }
  }

  get ext(): string {
    return extname(this.assetURL.pathname)
  }

  get name(): string {
    return basename(this.assetURL.pathname)
  }

  get fullURL(): string {
    return this.assetURL.toString()
  }

  get s3FileKey(): string {
    return `assets/${this.aid}/${this.name}`
  }

  get isInWhiteList(): boolean {
    if (upstreamWhiteList) {
      return micromatch.isMatch(this.assetURL.hostname, upstreamWhiteList)
    }

    return true
  }

  public async matchFileHash(fileHash: string): Promise<Asset | null> {
    const asset = await Asset.findOne({
      where: {
        fileHash,
      },
    })

    return asset
  }

  public async init(): Promise<InitResult> {
    if (this.hasInit) {
      throw new Error(
        `AssetManager already initialized for asset ${this.assetURL}`
      )
    }

    if (!this.isInWhiteList) {
      throw new boom.Boom('Asset is from host that is not in white list', {
        statusCode: 400,
      })
    }

    let assetModel = await Asset.findOne({
      where: {
        aid: this.aid,
      },
    })

    if (
      assetModel &&
      assetModel.assetState === AssetState.PENDING &&
      dayjs(assetModel.createdAt).add(10, 'minute').isBefore(dayjs())
    ) {
      await assetModel.destroy()
      assetModel = null
    }

    if (assetModel) {
      if (assetModel.assetState === AssetState.UPLOADED) {
        const object = await getObject({
          Key: this.s3FileKey,
        })

        return {
          assetState: assetModel.assetState,
          asset: object.Body,
          assetFileHash: assetModel.fileHash,
          mime: assetModel.mime,
        }
      }

      this.hasInit = true

      return {
        assetState: assetModel.assetState,
      }
    } else {
      const assetModel = await Asset.create({
        aid: this.aid,
        ext: this.ext,
        name: this.name,
        assetState: AssetState.PENDING,
      })

      if (!assetModel) {
        throw new Error('Failed to create asset model')
      }

      try {
        const { tempFileBuffer, size, mime, isImage } =
          await this.saveTempFile()
        const { width, height } = isImage
          ? await AssetManager.probeImage(tempFileBuffer)
          : { width: undefined, height: undefined }

        // TODO: handle the UPLOADING state
        const fileHash = getETagFromBuffer(tempFileBuffer)

        await assetModel.update({
          mime,
          size,
          fileHash,
          width,
          height,
        })

        await this.saveToS3(tempFileBuffer)

        await assetModel.update({
          assetState: AssetState.UPLOADED,
        })

        this.hasInit = true

        return {
          assetState: AssetState.UPLOADED,
          asset: tempFileBuffer,
          assetFileHash: fileHash,
          mime,
        }
      } catch (error) {
        await assetModel.destroy()
        throw error
      }
    }
  }

  private async saveTempFile(): Promise<{
    tempFilePath: string
    tempFileBuffer: Buffer
    size: number
    mime: string
    isImage?: boolean
  }> {
    const response = await got.get(this.fullURL, {
      http2: true,
      responseType: 'buffer',
    })
    const tempFilePath = join(tempDir, `${this.aid}-${this.name}`)
    const fileBuffer = response.rawBody
    const bufferSize = fileBuffer.byteLength

    await fs.writeFile(tempFilePath, fileBuffer, { encoding: 'binary' })

    if (response?.headers?.['content-type']) {
      const contentType = response.headers['content-type']

      return {
        tempFilePath,
        tempFileBuffer: fileBuffer,
        size: bufferSize,
        mime: contentType,
        isImage: contentType.toLowerCase().includes('image'),
      }
    }

    return {
      tempFilePath,
      tempFileBuffer: fileBuffer,
      size: bufferSize,
      mime: 'application/octet-stream',
    }
  }

  private async saveToS3(fileBuffer: Buffer): Promise<void> {
    await putObject({
      Key: this.s3FileKey,
      Body: fileBuffer,
    })
  }

  private static async probeImage(fileBuffer: Buffer): Promise<{
    width?: number
    height?: number
  }> {
    const result = probe.sync(fileBuffer)

    if (!result) {
      return {}
    }

    return {
      width: result.width,
      height: result.height,
    }
  }
}

export default AssetManager
