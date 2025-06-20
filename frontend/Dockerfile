# Stage 1: build
FROM node:16-alpine AS builder
WORKDIR /app

# Only copy package.json (don’t copy yarn.lock)
COPY package.json ./

# Install dependencies (this will create a yarn.lock in‐container)
RUN yarn install --frozen-lockfile

# Copy the rest of your source & build
COPY . .
RUN yarn build

# Stage 2: serve with nginx
FROM nginx:stable-alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
