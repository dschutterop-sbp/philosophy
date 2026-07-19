FROM node:22-alpine

WORKDIR /app
COPY package.json index.html ./
COPY src ./src
COPY server ./server
RUN mkdir -p /app/data

EXPOSE 8080
CMD ["npm", "start"]
