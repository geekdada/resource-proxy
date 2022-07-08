import 'dotenv/config'

import { initServer } from './app.js'

// Start the server
;(async () => {
  const server = await initServer(
    '0.0.0.0',
    process.env.PORT ? Number(process.env.PORT) : 8000
  )

  await server.start()
})().catch((err) => {
  console.error(err)
  process.exit(1)
})

process.on('unhandledRejection', (err) => {
  console.log(err)
  process.exit(1)
})
