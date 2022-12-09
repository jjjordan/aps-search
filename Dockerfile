FROM node:17 as build

WORKDIR /opt/search
COPY package.json package-lock.json /opt/search/
RUN npm install

COPY . /opt/search/
RUN npm run gulp rel

FROM nginx:1.23.2
COPY --from=build /opt/search/out/rel /usr/share/nginx/html
