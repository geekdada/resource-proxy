import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
  GetObjectCommandInput,
  GetObjectCommand,
} from '@aws-sdk/client-s3'

import {
  s3AccessKeyId,
  s3Bucket,
  s3Endpoint,
  s3SecretAccessKey,
} from './config.js'

export const client = new S3Client({
  endpoint: s3Endpoint,
  credentials: {
    accessKeyId: s3AccessKeyId,
    secretAccessKey: s3SecretAccessKey,
  },
  forcePathStyle: true,
})

export const putObject = async (
  params: Omit<PutObjectCommandInput, 'Bucket'>
) => {
  const command = new PutObjectCommand({
    ...params,
    Bucket: s3Bucket,
  })

  await client.send(command)
}

export const getObject = async (
  params: Omit<GetObjectCommandInput, 'Bucket'>
) => {
  const command = new GetObjectCommand({
    ...params,
    Bucket: s3Bucket,
  })

  return client.send(command)
}
