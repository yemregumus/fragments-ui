# Stage 1: Install the dependencies ########################################
FROM node:20.11.1-bullseye@sha256:2056770f9050f845d41f0b025f966f2c49f0148d073ca65b110a2fbb4749774c AS dependencies

WORKDIR /app

COPY package* ./

RUN npm install
############################################################################

# Stage 2: Build the side ##################################################
FROM dependencies AS build

ARG API_URL= \
   AWS_COGNITO_POOL_ID= \
   AWS_COGNITO_CLIENT_ID= \
   AWS_COGNITO_HOSTED_UI_DOMAIN= \
   OAUTH_SIGN_IN_REDIRECT_URL= \
   OAUTH_SIGN_OUT_REDIRECT_URL= 

WORKDIR /app

# Copying the dependencies from Stage 1 to /application
COPY --from=dependencies /app /app

# Copying the source code
COPY ./src ./src

RUN npm run build
############################################################################

# Stage 3: Move the build to nginx and keep running the health check #######
FROM nginx:stable AS deploy

# Copying the application from development stage!
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=30s --start-period=10s --retries=3 \
   CMD curl --fail localhost || exit 1

###########################################################################