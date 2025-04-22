FROM node:20

WORKDIR /src

COPY . .

RUN rm -rf node_modules

RUN npm uninstall bcrypt && \
    npm install bcryptjs && \
    npm install

CMD ["npx", "ts-node", "./src/app.ts"]