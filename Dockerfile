FROM node:20-alpine

WORKDIR /src

COPY . .

RUN yarn install

CMD ["yarn", "nodemon"]
