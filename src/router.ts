import { Server } from '@hapi/hapi'

import indexRoute from './controllers/index.js'
import proxyRoute from './controllers/proxy.js'
import proxyV2Route from './controllers/v2/proxy.js'

export default (server: Server) => {
  server.route([indexRoute, proxyRoute, proxyV2Route])
}
