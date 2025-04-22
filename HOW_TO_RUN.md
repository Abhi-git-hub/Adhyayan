# How to Run Adhyayan Website

## Prerequisites
- Node.js (v14 or higher)
- MongoDB (running locally or a connection string to a remote instance)
- npm (Node Package Manager)

## Setup Steps

1. **Install dependencies for the server**
   ```
   npm install
   ```

2. **Install dependencies for the client**
   ```
   cd client
   npm install
   cd ..
   ```

3. **Set up environment variables**
   Copy the `.env.example` file to `.env` (if it exists) or create a new `.env` file with the following content:
   ```
   MONGODB_URI=mongodb://localhost:27017/adhyayan
   SESSION_SECRET=your_session_secret
   PORT=3000
   ```

## Running the Application

### Option 1: Using the PowerShell Script (Windows)
Run the PowerShell script to start both server and client:
```
./start-app.ps1
```

### Option 2: Starting Client and Server Separately
If you encounter issues with the `&&` operator in PowerShell, use these commands:

1. **Start the server in one terminal**
   ```
   node server.js
   ```

2. **Start the client in another terminal**
   ```
   ./start-client.ps1
   ```
   
   Or manually:
   ```
   cd client
   npm start
   ```

The server will run on port 3000 and the client will run on port 3001.

## Application Access
- Server API: http://localhost:3000
- Client UI: http://localhost:3001

## Troubleshooting

### PowerShell Syntax Error with &&
If you see an error like:
```
The token '&&' is not a valid statement separator in this version.
```
Use the separate commands as described in Option 2 above.

### Webpack Deprecation Warnings
These warnings are harmless and have been suppressed in the latest version:
```
[DEP_WEBPACK_DEV_SERVER_ON_AFTER_SETUP_MIDDLEWARE] DeprecationWarning: 'onAfterSetupMiddleware' option is deprecated. Please use the 'setupMiddlewares' option.
[DEP_WEBPACK_DEV_SERVER_ON_BEFORE_SETUP_MIDDLEWARE] DeprecationWarning: 'onBeforeSetupMiddleware' option is deprecated. Please use the 'setupMiddlewares' option.
```

### Redirect Loop Issues
If you're experiencing redirect loops (constantly being redirected to the dashboard), try clearing your browser cache and local storage:
1. Open browser developer tools (F12)
2. Go to Application tab > Storage > Clear Site Data
3. Refresh the page

### Port Conflicts
If you encounter port conflicts, you can use the `killports.ps1` script:
```
./killports.ps1
``` 