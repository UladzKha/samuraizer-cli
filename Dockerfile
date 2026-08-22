FROM node:22-slim

WORKDIR /app

COPY . .

RUN npm ci
RUN npm run build --workspace @samuraizer/cli
RUN npm run build --workspace @samuraizer/mcp-server

ENTRYPOINT ["node", "packages/mcp-server/dist/index.js"]
