# Use official Node.js image
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build TypeScript
RUN npm run build

# Expose port 3001
EXPOSE 3001

# Start the server
CMD ["npm", "start"]
