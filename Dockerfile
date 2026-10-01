# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Install build tools for native modules like bcrypt
RUN apk add --no-cache python3 make g++

# Install app dependencies with legacy peer deps
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Bundle app source
COPY . .

# Expose the port the app runs on
EXPOSE 5006

# Define the command to run your app
CMD ["node", "index.js"]
