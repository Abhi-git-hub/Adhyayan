const path = require('path');

module.exports = {
  // This is a minimal webpack configuration to customize the webpack dev server.
  // The full webpack config is handled by react-scripts.
  devServer: {
    // Replace deprecated options with new setupMiddlewares option
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }
      
      // This is where we would have used onBeforeSetupMiddleware
      // Now we use setupMiddlewares, which eliminates the deprecation warning
      
      return middlewares;
    },
    // Other dev server options
    port: process.env.PORT || 3001,
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
}; 