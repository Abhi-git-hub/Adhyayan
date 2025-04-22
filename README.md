# Adhyayan Website

A student management system for educational institutions. This application enables teachers to manage attendance, upload notes, and record test scores, while students can view their attendance, download study notes, and check their test results.

## Prerequisites

- Node.js (v14.x or higher)
- MongoDB (local or Atlas)
- npm or yarn

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

3. Create a `config/default.json` file with the following content:
```json
{
  "mongoURI": "your_mongodb_connection_string",
  "jwtSecret": "your_jwt_secret_key",
  "jwtExpiration": 3600
}
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

## Common Issues and Solutions

1. **Authentication Issues**: If pages are not displaying or API calls are failing, check if your authentication token is valid. Try logging out and logging back in.

2. **Missing Uploads Directory**: If file uploads are failing, make sure the server has permissions to create and write to the `uploads` directory.

3. **Database Connection**: Ensure your MongoDB instance is running and the connection string in `config/default.json` is correct.

4. **API Endpoints**: All API endpoints require authentication. Make sure to include the token in the Authorization header for all requests.

## Features

- **User Authentication**: Separate login for students and teachers
- **Teacher Features**: Take attendance, upload study notes, record test scores
- **Student Features**: View attendance, download notes, check test scores
- **Profile Management**: Update personal information

## Troubleshooting Common Issues

- **Student/Teacher Pages Not Visible**: Make sure you're logged in with the correct user type and your authentication token is valid.
- **Attendance Not Saving**: Check if the batch is correctly selected and all fields are properly filled.
- **File Upload Issues**: Ensure the file is a PDF under 10MB in size.
- **Download Problems**: Verify that the file exists in the server's uploads directory.

## Project Structure

```
adhyayan-website/
├── middleware/       # Authentication middleware
├── models/           # MongoDB models
├── public/           # Static files
├── routes/           # API routes
├── .env              # Environment variables
├── package.json      # Project dependencies
├── README.md         # Project documentation
└── server.js         # Main server file
```

## License

This project is licensed under the MIT License. 