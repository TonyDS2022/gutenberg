// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
import path from 'path';

// Load from the backend package directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { createServer } from './server';
import { env } from './config/env';

const startServer = async () => {
  try {
    const app = createServer();
    const port = env.PORT;

    app.listen(port, () => {
      console.log(`🚀 Backend server running on http://localhost:${port}`);
      console.log(`📚 API available at http://localhost:${port}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
