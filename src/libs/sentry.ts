import Hapi from '@hapi/hapi'
// @ts-ignore
import HapiSentry from 'hapi-sentry'

import { sentryDSN } from './config.js'

export const registerSentry = async (server: Hapi.Server) => {
  if (sentryDSN) {
    await server.register({
      plugin: HapiSentry,
      options: {
        client: { dsn: sentryDSN },
      },
    })
  }
}
