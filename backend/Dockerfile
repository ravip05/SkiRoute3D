FROM node:16-alpine
WORKDIR /usr/src/app
COPY package.json tsconfig.json ./
RUN yarn install --frozen-lockfile
COPY . .
EXPOSE 4000
CMD ["yarn", "start"]