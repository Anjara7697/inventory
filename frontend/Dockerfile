FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Public URL of the API as seen from the *browser* (baked into the bundle at build time)
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# Currency shown in the interface (ISO 4217 code), also baked in at build time
ARG NEXT_PUBLIC_CURRENCY=EUR
ENV NEXT_PUBLIC_CURRENCY=$NEXT_PUBLIC_CURRENCY
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/next.config.mjs ./
EXPOSE 3000
CMD ["npm", "start"]
