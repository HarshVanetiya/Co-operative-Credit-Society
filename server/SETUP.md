# Server Setup Guide

This guide describes how to set up and run the backend server for the banking application.

## Prerequisites

Ensure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/) (v16 or higher recommended)
*   [PostgreSQL](https://www.postgresql.org/) (Ensure the service is running)

## Installation

1.  Navigate to the server directory:
    ```bash
    cd server
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

## Environment Configuration

1.  Create a `.env` file in the root of the `server` directory.
2.  Add the following environment variables. You will need to provide your own values.

    ```bash
    # Port to run the server on (default: 3001)
    PORT=3001

    # PostgreSQL Database URL
    # Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
    DATABASE_URL="postgresql://username:password@localhost:5432/bank_db?schema=public"

    # JWT Secret for authentication
    JWT_SECRET="your_secure_jwt_secret"
    ```

## Database Setup

1.  Generate the Prisma client:
    ```bash
    npx prisma generate
    ```

2.  Push the schema to the database (creates tables):
    ```bash
    npx prisma db push
    ```
    *Alternatively, if using migrations:*
    ```bash
    # npx prisma migrate dev --name init
    ```

3.  (Optional) Seed the database with initial data:
    ```bash
    npm run seed
    ```

## Running the Server

### Development Mode
To run the server with hot-reloading (using `nodemon` implied or just standard node if `dev` script is simple):
```bash
npm run dev
```
The server will start at `http://localhost:3001` (or your configured PORT).

### Production Mode
1.  Start the server:
    ```bash
    npm start
    ```

## API Endpoints
The server exposes APIs under `/api`.
- Health check: `GET /health`

## File Structure
- `prisma/`: Database schema and seed scripts.
- `routes/`: API route definitions.
- `controller/`: Request handlers.
- `middleware/`: Express middlewares (auth, validation, etc.).
- `lib/`: Utility functions.
