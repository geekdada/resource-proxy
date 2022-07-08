import { ServerRoute } from '@hapi/hapi'
import Joi from 'joi'
import { AssetState } from '../constants/asset.js'

import AssetManager from '../services/asset-manager.js'

const proxyRoute: ServerRoute = {
  method: 'GET',
  path: '/p/{target*}',
  options: {
    validate: {
      params: Joi.object({
        target: Joi.string()
          .uri({
            scheme: [/^https?/],
          })
          .required(),
      }),
    },
  },
  handler: async (request, h) => {
    const { target } = request.params
    const { search } = request.url
    const targetURL = new URL(target)
    targetURL.search = search

    const assetManager = new AssetManager(targetURL)

    if (request.headers['if-none-match']) {
      const etag = request.headers['if-none-match']
      const asset = await assetManager.matchFileHash(etag)

      if (asset && asset.fileHash === etag) {
        return h.response().code(304)
      }
    }

    const { assetState, asset, mime, assetFileHash } = await assetManager.init()

    switch (assetState) {
      case AssetState.PENDING: {
        const res = h.response('PENDING').code(202)

        res.header('cache-control', 'no-cache')

        return res
      }
      case AssetState.UPLOADED: {
        const res = h.response(asset).type(mime || 'application/octet-stream')

        res.header('cache-control', 'public, max-age=31536000, immutable')

        if (assetFileHash) {
          res.header('etag', assetFileHash)
        }

        return res
      }
      default: {
        const res = h.response('ERROR').code(500)

        res.header('cache-control', 'no-cache')

        return res
      }
    }
  },
}

export default proxyRoute
