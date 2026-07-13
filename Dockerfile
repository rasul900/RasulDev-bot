FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p uploads/merch uploads/checks uploads/broadcast uploads/incoming

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]
