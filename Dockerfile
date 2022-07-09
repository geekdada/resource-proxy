FROM node:16-alpine AS builder

ENV APP_DIR /home/node/app

RUN mkdir -p $APP_DIR/node_modules && chown -R node:node $APP_DIR

WORKDIR $APP_DIR

COPY package.json ./
COPY yarn.lock ./

USER node

RUN yarn install --frozen-lockfile

COPY --chown=node:node . .

RUN yarn build

FROM node:16-alpine

ARG PORT=8000

ENV NODE_ENV production
ENV APP_DIR /home/node/app
ENV DATA_DIR /home/node/app/data

LABEL maintainer="Roy Li<me@royli.dev>"

RUN set -eux; \
    mkdir -p "$APP_DIR"; \
    mkdir -p "$DATA_DIR"; \
    chown node:node -R "$APP_DIR"

WORKDIR $APP_DIR

USER node

COPY --chown=node:node --from=builder $APP_DIR/build ./build
COPY --chown=node:node --from=builder $APP_DIR/node_modules ./node_modules
COPY --chown=node:node --from=builder $APP_DIR/package.json ./package.json

CMD [ "node", "build/index.js" ]

