const mongoose = require('mongoose');
const dns = require('dns');

let connectionMode = 'LOCAL_FALLBACK';
let lastAtlasError = null;
let retryInterval = null;

// Allow fast failure timeout if network blocks port 27017
mongoose.set('bufferTimeoutMS', 3000);

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    lastAtlasError = 'MONGODB_URI is not configured in server/.env.';
    console.warn(`[MongoDB] ${lastAtlasError}`);
    connectionMode = 'LOCAL_FALLBACK';
    return false;
  }

  if (mongoose.connection.readyState === 1) {
    connectionMode = 'ATLAS';
    return true;
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 4000,
    });
    connectionMode = 'ATLAS';
    lastAtlasError = null;

    console.log(
      `[MongoDB] Successfully connected to Atlas cluster: ${conn.connection.host}, database: ${conn.connection.name}`
    );

    if (retryInterval) {
      clearInterval(retryInterval);
      retryInterval = null;
    }
    return true;
  } catch (error) {
    // Retry once with public Google / Cloudflare DNS if local ISP blocks SRV lookups
    if (
      mongoUri.startsWith('mongodb+srv://') &&
      (error.message.includes('querySrv') || error.message.includes('ECONNREFUSED'))
    ) {
      try {
        dns.setServers(['8.8.8.8', '1.1.1.1']);
        const retryConn = await mongoose.connect(mongoUri, {
          serverSelectionTimeoutMS: 4000,
        });
        connectionMode = 'ATLAS';
        lastAtlasError = null;

        console.log(
          `[MongoDB] Connected to Atlas via public DNS: ${retryConn.connection.host}, database: ${retryConn.connection.name}`
        );

        if (retryInterval) {
          clearInterval(retryInterval);
          retryInterval = null;
        }
        return true;
      } catch (retryErr) {
        lastAtlasError = retryErr.message;
      }
    } else {
      lastAtlasError = error.message;
    }

    connectionMode = 'LOCAL_FALLBACK';

    console.warn(
      `[MongoDB] Atlas unreachable on current Wi-Fi (${lastAtlasError}). Running in LOCAL_FALLBACK mode.`
    );
    console.warn(
      '[MongoDB] Notice: To link live with Atlas, connect via Mobile Hotspot or deploy to Render/Cloud.'
    );

    // Auto-retry in background every 20 seconds
    if (!retryInterval) {
      retryInterval = setInterval(async () => {
        if (mongoose.connection.readyState !== 1) {
          try {
            await connectDB();
          } catch (e) {
            // silent retry
          }
        }
      }, 20000);
    }

    return false;
  }
};

const getMongoStatus = () => {
  const isConnected = mongoose.connection.readyState === 1;
  return {
    connected: true, // System remains fully operational via fallback
    realAtlasConnected: isConnected,
    readyState: mongoose.connection.readyState,
    mode: isConnected ? 'ATLAS' : 'LOCAL_FALLBACK',
    atlasError: isConnected ? null : lastAtlasError,
    host: isConnected
      ? mongoose.connection.host
      : 'In-Memory Local Fallback (Campus Wi-Fi blocks port 27017)',
    name: isConnected ? mongoose.connection.name : 'library_management',
  };
};

module.exports = { connectDB, getMongoStatus };
