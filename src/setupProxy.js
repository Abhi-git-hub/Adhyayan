const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Determine the target based on environment
  const target = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  
  console.log(`Setting up proxy to target: ${target}`);
  
  // Forward API requests to the backend server
  app.use(
    '/api',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/api', // no rewriting needed for standard setup
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).json({ 
          error: 'Proxy Error', 
          message: err.message,
          target
        });
      }
    })
  );
  
  // Forward uploads requests to the backend server
  app.use(
    '/uploads',
    createProxyMiddleware({
      target,
      changeOrigin: true,
    })
  );
  
  // Fix for webpack-dev-server deprecation warnings
  if (process.env.REACT_APP_WEBPACK_MODE === 'modern') {
    const webpackDevServer = require('webpack-dev-server');
    
    // Replace deprecated onBeforeSetupMiddleware and onAfterSetupMiddleware
    // with new setupMiddlewares
    if (webpackDevServer.prototype && 
        typeof webpackDevServer.prototype.setupMiddlewares !== 'function') {
      
      webpackDevServer.prototype.setupMiddlewares = function(middlewares, devServer) {
        if (!devServer) {
          throw new Error('webpack-dev-server is not defined');
        }

        if (this.options.onBeforeSetupMiddleware) {
          this.options.onBeforeSetupMiddleware(devServer);
        }
        
        middlewares.push(...devServer.app._router.stack);
        
        if (this.options.onAfterSetupMiddleware) {
          this.options.onAfterSetupMiddleware(devServer);
        }
        
        return middlewares;
      };
    }
  }
}; 