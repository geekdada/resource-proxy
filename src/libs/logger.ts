import Hapi from '@hapi/hapi'
import HapiPino from 'hapi-pino'
import { pino } from 'pino'

import { isProd } from './config.js'

export const serverLogger = pino(
  {
    level: isProd ? 'info' : 'debug',
  },
  process.stdout
)

export const registerLogger = async (server: Hapi.Server) => {
  await server.register({
    plugin: HapiPino,
    options: {
      redact: [],
      wrapSerializers: true,
      level: isProd ? 'info' : 'debug',
    },
  })
}
