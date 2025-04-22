FROM node:20

WORKDIR /src

COPY . .

RUN rm -rf node_modules

RUN npm uninstall bcrypt && \
    npm install bcryptjs && \
    npm install

RUN mkdir -p node_modules/bcrypt && \
    echo "module.exports = require('bcryptjs');" > node_modules/bcrypt/index.js

# Add host mapping to ensure MongoDB connection works
RUN echo "host.docker.internal host-gateway" >> /etc/hosts

CMD ["npx", "ts-node", "./src/app.ts"]