FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build \
 && npx tsc prisma/seed.ts --outDir dist-seed --module commonjs --target es2022 --esModuleInterop --skipLibCheck

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm i --no-save prisma@6
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-seed ./dist-seed
COPY --from=build /app/prisma ./prisma
RUN npx prisma generate
EXPOSE 3001
# Applies migrations, (idempotently) seeds units/characteristics/admin, then starts the API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist-seed/seed.js && node dist/main"]
