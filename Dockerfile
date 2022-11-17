FROM node:17 as build

WORKDIR /opt/search
COPY gulpfile.js package.json package-lock.json /opt/search/
RUN npm install

COPY data /opt/search/data/
RUN bzip2 -d /opt/search/data/registry.json.bz2
COPY html /opt/search/html/
COPY src /opt/search/src/

RUN ./node_modules/gulp/bin/gulp.js

FROM nginx:1.23.2
COPY --from=build /opt/search/out/rel /usr/share/nginx/html
