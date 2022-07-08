FROM node:16

LABEL maintainer="Roy Li<me@royli.dev>"

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package.json ./
COPY yarn.lock ./

USER node

RUN yarn install

COPY --chown=node:node . .

RUN yarn build

CMD [ "node", "build/index.js" ]

