import os from 'node:os'
import { join } from 'node:path'
import { cleanEnv, str } from 'envalid'

const envs = cleanEnv(process.env, {
  S3_ENDPOINT: str(),
  S3_BUCKET: str(),
  S3_REGION: str(),
  S3_ACCESS_KEY_ID: str(),
  S3_SECRET_ACCESS_KEY: str(),
})

export const isProd = process.env.NODE_ENV === 'production'

export const tempDir = join(os.tmpdir(), 'dev.royli.resource-proxy')

export const s3Endpoint = envs.S3_ENDPOINT
export const s3Bucket = envs.S3_BUCKET
export const s3Region = envs.S3_REGION
export const s3AccessKeyId = envs.S3_ACCESS_KEY_ID
export const s3SecretAccessKey = envs.S3_SECRET_ACCESS_KEY

export const upstreamWhiteList = process.env.UPSTREAM_WHITE_LIST
  ? process.env.UPSTREAM_WHITE_LIST.split(',')
  : []

export const originWhiteList = process.env.ORIGIN_WHITE_LIST
  ? process.env.ORIGIN_WHITE_LIST.split(',')
  : []

export const sentryDSN = process.env.SENTRY_DSN
