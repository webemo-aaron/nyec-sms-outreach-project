FROM node:20-alpine AS build

WORKDIR /app
ARG VITE_API_BASE_URL=http://localhost:3001/api/nyec
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN --mount=type=secret,id=extra_ca,target=/tmp/extra-ca.crt,required=false \
    if [ -s /tmp/extra-ca.crt ]; then \
      mkdir -p /etc/ssl/certs /usr/local/share/ca-certificates; \
      cat /tmp/extra-ca.crt >> /etc/ssl/certs/ca-certificates.crt; \
      cp /tmp/extra-ca.crt /usr/local/share/ca-certificates/work-root-ca.crt; \
    fi; \
    apk add --no-cache ca-certificates; \
    if [ -s /tmp/extra-ca.crt ]; then \
      update-ca-certificates; \
    fi

COPY package*.json ./
RUN npm ci

COPY index.html vite.config.ts tsconfig.json ./
COPY src ./src
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
