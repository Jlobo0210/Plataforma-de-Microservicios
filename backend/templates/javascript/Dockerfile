FROM node:18-slim

WORKDIR /app

# Express es el framework HTTP de Node, lo instalamos una sola vez
RUN npm install express

COPY runner.js .

CMD ["node", "runner.js"]