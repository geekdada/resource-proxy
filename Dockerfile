FROM node:16-alpine AS builder

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package.json ./
COPY yarn.lock ./

USER node

RUN yarn install --frozen-lockfile

COPY --chown=node:node . .

RUN yarn build

FROM node:16-alpine

LABEL maintainer="Roy Li<me@royli.dev>"

WORKDIR /home/node/app

USER node

COPY --chown=node:node --from=builder /home/node/app/build ./build
COPY --chown=node:node --from=builder /home/node/app/node_modules ./node_modules
COPY --chown=node:node --from=builder /home/node/app/package.json ./package.json

CMD [ "node", "build/index.js" ]

