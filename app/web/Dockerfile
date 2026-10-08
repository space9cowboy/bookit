# --- build : bundle Vite. VITE_BUG est figé dans le bundle au build.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_BUG=""
ENV VITE_BUG=$VITE_BUG
RUN npm run build

# --- runtime : nginx sert le front et proxifie /api vers le service api
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
