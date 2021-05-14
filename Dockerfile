# Base image
FROM registry.nexdev.net:5050/docker/node:14.15.1-slim

USER root
# RUN apt-get update
# RUN apt-get install -y build-essential python

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV
RUN mkdir /app && chown node:node /app
WORKDIR /app

USER node
COPY package.json package-lock.json* ./

RUN npm run reg
RUN npm install --loglevel verbose && npm cache clean --force
ENV PATH /app/node_modules/.bin:$PATH

WORKDIR /app/src
COPY ./src .

HEALTHCHECK --interval=10s CMD node healthcheck.js

CMD [ "node", "./server.js" ]
