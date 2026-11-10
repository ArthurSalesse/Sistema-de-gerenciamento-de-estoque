FROM node:24-alpine

WORKDIR /app

# Roda como o usuário "node" (uid 1000), não como root: arquivos criados no volume
# (ex.: uploads) ficam com o mesmo dono do usuário do host
RUN chown node:node /app
USER node

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

COPY --chown=node:node . .

EXPOSE 3000
CMD ["npm", "start"]
