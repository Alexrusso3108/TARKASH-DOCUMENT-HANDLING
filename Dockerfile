# Stage 1: Build the Vite Frontend
FROM node:18-alpine AS build

WORKDIR /app

# Copy root dependency files (frontend)
COPY package*.json ./
RUN npm install

# Copy root files to build the frontend
COPY . .
RUN npm run build

# Stage 2: Serve the backend + frontend
FROM node:18-alpine

WORKDIR /app

# Copy the server directory specifically
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install

# Copy the rest of the backend files
COPY server/ ./

# Create uploads directory (ensure permissions)
RUN mkdir -p uploads/forms

# Copy the built frontend static assets into the /app/dist folder of this container
# so the Express server can serve them
COPY --from=build /app/dist /app/dist

# Expose port and start
EXPOSE 5000
ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "index.js"]
