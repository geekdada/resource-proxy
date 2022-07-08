import { extname, basename } from 'node:path'
import got from 'got'
import { join } from 'node:path'
import fs, { ReadStream } from 'fs-extra'
import probe from 'probe-image-size'
import { AssetState } from '../constants/asset.js'

import { tempDir } from '../libs/config.js'
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
  public assetModel: Asset | null = null
  public hasInit = false

  constructor(private assetURL: URL) {
    this.aid = getSHA1(this.assetURL.origin + this.assetURL.pathname)
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

    const assetModel = await Asset.findOne({
      where: {
        aid: this.aid,
      },
    })

    if (assetModel) {
      this.assetModel = assetModel

      if (this.assetModel.assetState === AssetState.UPLOADED) {
        const object = await getObject({
          Key: this.s3FileKey,
        })

        return {
          assetState: this.assetModel.assetState,
          asset: object.Body,
          assetFileHash: this.assetModel.fileHash,
          mime: this.assetModel.mime,
        }
      }

      this.hasInit = true

      return {
        assetState: this.assetModel.assetState,
      }
    } else {
      const { tempFileBuffer, size, mime, isImage } = await this.saveTempFile()
      const { width, height } = isImage
        ? await AssetManager.probeImage(tempFileBuffer)
        : { width: undefined, height: undefined }

      this.assetModel = await Asset.create({
        aid: this.aid,
        mime,
        ext: this.ext,
        size,
        fileHash: getETagFromBuffer(tempFileBuffer),
        width,
        height,
        name: this.name,
        assetState: AssetState.PENDING,
      })

      if (!this.assetModel) {
        throw new Error('Failed to create asset model')
      }

      await this.saveToS3(tempFileBuffer)

      await Asset.update(
        {
          assetState: AssetState.UPLOADED,
        },
        {
          where: {
            aid: this.aid,
          },
        }
      )

      this.hasInit = true

      return {
        assetState: AssetState.UPLOADED,
        asset: tempFileBuffer,
        assetFileHash: this.assetModel.fileHash,
        mime,
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
