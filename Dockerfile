FROM node:20

WORKDIR /src

COPY . .

# Install build dependencies for bcrypt
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    make \
    g++

# Clean install with native bcrypt
RUN rm -rf node_modules
RUN npm ci || npm install

CMD ["npx", "ts-node", "./src/app.ts"]