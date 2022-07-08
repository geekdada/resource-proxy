import { ServerRoute } from '@hapi/hapi'

const indexRoute: ServerRoute = {
  method: 'GET',
  path: '/',
  handler: async () => {
    return 'Hello World!'
  },
}

export default indexRoute
