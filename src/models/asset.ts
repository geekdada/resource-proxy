import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  DataTypes,
  NonAttribute,
  CreationOptional,
} from 'sequelize'
import { AssetState } from '../constants/asset.js'

import { getDatabase } from '../libs/db.js'
import { assertNever } from '../libs/utils.js'

const sequelize = getDatabase()

class Asset extends Model<
  InferAttributes<Asset>,
  InferCreationAttributes<Asset>
> {
  declare aid: string
  declare mime: string
  declare ext: string
  declare size: number
  declare fileHash: string
  declare width?: number
  declare height?: number
  declare name?: string
  declare assetState: AssetState
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  get assetId(): NonAttribute<string> {
    return this.aid
  }
}

Asset.init(
  {
    aid: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    mime: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ext: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fileHash: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    assetState: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      get(): AssetState {
        const rawValue = this.getDataValue('assetState')

        switch (rawValue) {
          case AssetState.PENDING:
            return AssetState.PENDING

          case AssetState.UPLOADING:
            return AssetState.UPLOADING

          case AssetState.UPLOADED:
            return AssetState.UPLOADED

          case AssetState.DELETED:
            return AssetState.DELETED

          default:
            return assertNever(rawValue)
        }
      },
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'assets',
    indexes: [{ unique: true, fields: ['fileHash'] }],
  }
)

export { Asset }
