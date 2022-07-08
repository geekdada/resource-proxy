import { Sequelize } from 'sequelize'
import { join } from 'path'

import { isProd } from './config.js'

const file = join(process.cwd(), 'db.sqlite')

export const getDatabase = (() => {
  let database: Sequelize

  return () => {
    if (!database) {
      database = new Sequelize({
        dialect: 'sqlite',
        storage: file,
        logging: false,
      })
    }
    return database
  }
})()
