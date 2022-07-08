import crypto from 'node:crypto'
import etag from 'etag'

export const getSHA1 = (str: string): string => {
  const sha1 = crypto.createHash('sha1')
  sha1.update(str)
  return sha1.digest('hex')
}

export const getETagFromBuffer = (buffer: Buffer): string => {
  return etag(buffer)
}
