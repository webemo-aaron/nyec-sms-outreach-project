FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

RUN --mount=type=secret,id=extra_ca,target=/tmp/extra-ca.crt,required=false \
    set -e; \
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
RUN npm ci --omit=dev

COPY src ./src

RUN mkdir -p /app/data

EXPOSE 3001
CMD ["npm", "run", "start"]
