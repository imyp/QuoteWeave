# Stage 1: Build the Next.js application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
# Ensure next.config.mjs is copied before build
COPY next.config.ts ./
COPY . .

# Build the Next.js application
# The output: 'standalone' in next.config.mjs will ensure a standalone build.
RUN pnpm run build

# Stage 2: Serve the application with Node.js
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Set environment variables for Next.js server
ENV NODE_ENV=production
# Optionally, you can set HOSTNAME and PORT if your app needs them or if you want to override defaults
# ENV HOSTNAME=0.0.0.0
# ENV PORT=3000

# Copy package.json and pnpm-lock.yaml to install only production dependencies
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile

# Copy the built Next.js application (including .next folder)
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./

# Expose port 3000 (Next.js default port)
EXPOSE 3000

# Start the Next.js application using pnpm
CMD ["pnpm", "next", "start"]