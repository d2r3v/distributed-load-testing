FROM node:20-alpine

WORKDIR /app

# Copy package files & install ALL deps (including dev deps)
COPY package*.json ./
RUN npm install

# Copy code
COPY tsconfig.json ./
COPY src ./src

ENV PORT=4000

CMD ["npx", "ts-node", "src/worker/server.ts"]
