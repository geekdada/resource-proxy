import Hapi from '@hapi/hapi'
import fs from 'fs-extra'

import { tempDir } from './libs/config.js'
import { getDatabase } from './libs/db.js'
import { registerLogger } from './libs/logger.js'
import createRouter from './router.js'

const initServer = async (host: string, port: number) => {
  const server = Hapi.server({
    port,
    host,
    debug: false,
  })
  const database = getDatabase()

  await database.authenticate()
  await database.sync()

  await registerLogger(server)

  createRouter(server)

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir)
  }

  return server
}

export { initServer }
