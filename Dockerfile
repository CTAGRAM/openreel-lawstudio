# ---- build ----
FROM node:20-bookworm AS build
RUN corepack enable && corepack prepare pnpm@11.7.0 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm build
# locate the web app's dist
RUN cp -r apps/web/dist /dist

# ---- serve ----
FROM node:20-bookworm-slim AS serve
WORKDIR /srv
COPY --from=build /dist ./dist
COPY server.mjs ./server.mjs
RUN npm install express@4 http-proxy-agent@7 https-proxy-agent@7 2>/dev/null || npm install express@4
ENV PORT=8000
EXPOSE 8000
CMD ["node", "server.mjs"]
