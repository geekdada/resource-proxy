import { Server } from '@hapi/hapi'

import indexRoute from './controllers/index.js'
import proxyRoute from './controllers/proxy.js'

export default (server: Server) => {
  server.route([indexRoute, proxyRoute])
}
