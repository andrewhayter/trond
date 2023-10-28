# Use an official Node.js runtime as a parent image
FROM node:14

# Set the working directory in the container to /app
WORKDIR /app

# Copy package.json and package-lock.json into the container at /app
COPY package*.json ./

# Install any needed packages specified in package.json
RUN npm install

# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source inside Docker image
COPY . .

# Transpile TypeScript into JavaScript
RUN npm run build

# Make port 80 available to the world outside this container
EXPOSE 80

# Run the transpiled JavaScript code when the container launches
CMD ["node", "dist/index.js"]