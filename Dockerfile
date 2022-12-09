FROM node:17 as build

WORKDIR /opt/search
COPY gulpfile.js package.json package-lock.json /opt/search/
RUN npm install

COPY . /opt/search/
RUN bzip2 -d /opt/search/data/registry.json.bz2 && ./node_modules/gulp/bin/gulp.js

FROM nginx:1.23.2
COPY --from=build /opt/search/out/rel /usr/share/nginx/html
