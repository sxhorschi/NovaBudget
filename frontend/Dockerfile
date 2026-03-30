# ── Stage 1: Build ────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .

ARG VITE_AZURE_CLIENT_ID
ARG VITE_AZURE_TENANT_ID
ARG VITE_API_BASE_URL
ARG VITE_AUTH_DISABLED=false
ARG VITE_URL_PREFIX=

ENV VITE_AZURE_CLIENT_ID=$VITE_AZURE_CLIENT_ID \
    VITE_AZURE_TENANT_ID=$VITE_AZURE_TENANT_ID \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_AUTH_DISABLED=$VITE_AUTH_DISABLED \
    VITE_URL_PREFIX=$VITE_URL_PREFIX

RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
