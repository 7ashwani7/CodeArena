import app from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

let server;

async function startServer() {
  try {
    // Attempt database connection
    await connectDB();

    server = app.listen(env.PORT, () => {
      console.log('----------------------------------------------------');
      console.log(` CodeArena Server running in [${env.NODE_ENV}] mode`);
      console.log(` Local URL:    http://localhost:${env.PORT}`);
      console.log(` Health Check: http://localhost:${env.PORT}/api/health`);
      console.log(` CORS Origin:  ${env.CLIENT_ORIGIN}`);
      console.log('----------------------------------------------------');
    });
  } catch (error) {
    console.error('[Server Startup Error]', error);
    process.exit(1);
  }
}

// Graceful shutdown handlers
async function handleShutdown(signal) {
  console.log(`\n[Shutdown] Received ${signal}. Closing HTTP server and database connections...`);
  if (server) {
    server.close(async () => {
      console.log('[Shutdown] HTTP server closed.');
      await disconnectDB();
      process.exit(0);
    });
  } else {
    await disconnectDB();
    process.exit(0);
  }
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

startServer();
