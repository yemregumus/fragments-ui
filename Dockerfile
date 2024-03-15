###############################################
# Stage 0: Install dependencies
FROM node:14-alpine AS dependencies

ENV NODE_ENV=production

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

###############################################
# Stage 1: Build the application
FROM dependencies AS build

# Set working directory
WORKDIR /app

# Copy cached dependencies from previous stage so we don't have to download
COPY --from=dependencies /app /app
# Copy source code into the image
COPY . .

# Build the application
RUN npm run build

###############################################
# Stage 2: Deployment
FROM node:14-alpine AS deployment

# Put our build/ into /usr/share/nginx/html/ and host static files
COPY --from=build /app/build/ /usr/share/nginx/html/

# Expose the port the app runs on
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
   CMD curl --fail localhost:80 || exit 1
