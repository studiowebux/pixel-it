# docker build -t pixel-it .
FROM denoland/deno:2.0.0

WORKDIR /usr/app

COPY ./server.ts /usr/app

CMD ["deno", "serve", "server.ts"]
