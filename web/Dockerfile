FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM base AS development
EXPOSE 3001
CMD ["npm", "run", "dev"]

FROM base AS production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]