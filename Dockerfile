FROM node:22-slim
WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY public ./public
ENV NODE_ENV=production
EXPOSE 3103
CMD ["node", "server.js"]
