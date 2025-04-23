# Adhyayan Website

A student management system for educational institutions. This application enables teachers to manage attendance, upload notes, and record test scores, while students can view their attendance, download study notes, and check their test results.

## Prerequisites

- Node.js (v16.x or higher)
- MongoDB (local or Atlas)
- npm (v8 or higher)

## Setup Instructions

### Server Setup

1. Navigate to the server directory:
```powershell
cd server
```

2. Install dependencies:
```powershell
npm install
```

3. Create a `.env` file with the following content:
```
MONGODB_URI=mongodb+srv://admin:1008@cluster0.xwpp1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=adhyayan_secret_key_2025_secure
PORT=3000
```

4. Start the server:
```powershell
npm start
```

### Client Setup

1. Navigate to the client directory:
```powershell
cd client
```

2. Install dependencies:
```powershell
npm install
```

3. Start the client:
```powershell
npm start
```

## Running the Application in Windows PowerShell

Since Windows PowerShell doesn't support the `&&` operator for command chaining, you should use either of these approaches:

### Option 1: Run commands separately
```powershell
# First terminal
cd server
npm start

# Second terminal
cd client
npm start
```

### Option 2: Use a single line with semicolons
```powershell
cd server; npm start
cd client; npm start
```

## Deployment Instructions

### MongoDB Atlas Setup

1. Create an account on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Set up a database user with read/write permissions
4. Whitelist your IP address or use 0.0.0.0/0 for all IPs
5. Get your connection string: `mongodb+srv://admin:1008@cluster0.xwpp1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
6. Update your `.env` file with this connection string

### Deploying to Render

1. Fork or push your code to a GitHub repository
2. Log in to [Render](https://render.com)
3. Click "New" and select "Web Service"
4. Connect your GitHub repository
5. Configure your service:
   - Name: `adhyayan-website`
   - Environment: `Node`
   - Build Command: `npm run render-build`
   - Start Command: `npm start`
6. Add environment variables:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: Your JWT secret key
   - `NODE_ENV`: `production`
7. Click "Create Web Service"

### Deploying to Vercel

1. Fork or push your code to a GitHub repository
2. Log in to [Vercel](https://vercel.com)
3. Click "New Project" and import your GitHub repository
4. Configure your project:
   - Framework Preset: `Other`
   - Root Directory: `/`
   - Build Command: `npm run vercel-build`
   - Output Directory: `client/build`
5. Add environment variables:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: Your JWT secret key
   - `NODE_ENV`: `production`
6. Click "Deploy"

### Testing MongoDB Atlas Connection

To test your MongoDB Atlas connection:

```bash
npm run check-db
```

This will attempt to connect to your MongoDB Atlas database and display the collections.

## Common Issues and Solutions

1. **Authentication Issues**: If pages are not displaying or API calls are failing, check if your authentication token is valid. Try logging out and logging back in.

2. **Missing Uploads Directory**: If file uploads are failing, make sure the server has permissions to create and write to the `uploads` directory.

3. **Database Connection**: Ensure your MongoDB Atlas connection string is correct and your IP is whitelisted.

4. **API Endpoints**: All API endpoints require authentication. Make sure to include the token in the Authorization header for all requests.

5. **CORS Issues**: If you're getting CORS errors, check that the client origin is properly set in the server's CORS configuration.

## Features

- **User Authentication**: Separate login for students and teachers
- **Teacher Features**: Take attendance, upload study notes, record test scores
- **Student Features**: View attendance, download notes, check test scores
- **Profile Management**: Update personal information

## Project Structure

```
adhyayan-website/
├── client/           # React frontend
├── middleware/       # Authentication middleware
├── models/           # MongoDB models
├── public/           # Static files
├── routes/           # API routes
├── scripts/          # Utility scripts
├── uploads/          # Uploaded files
├── .env              # Environment variables
├── package.json      # Project dependencies
├── server.js         # Main server file
├── vercel.json       # Vercel configuration
├── render.yaml       # Render configuration
└── README.md         # Project documentation
```

## License

This project is licensed under the MIT License. 