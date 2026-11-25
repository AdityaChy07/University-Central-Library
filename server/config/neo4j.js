const neo4j = require('neo4j-driver');

let driver = null;
let isNeo4jConnected = false;
let lastError = null;

const initNeo4j = () => {
  const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
  const user = process.env.NEO4J_USERNAME || 'neo4j';
  const password = process.env.NEO4J_PASSWORD || 'password';

  try {
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      maxConnectionLifetime: 3 * 60 * 60 * 1000,
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 5000,
    });

    // Test connectivity
    driver.verifyConnectivity()
      .then(serverInfo => {
        isNeo4jConnected = true;
        lastError = null;
        console.log(`[Neo4j] Connected successfully to ${serverInfo.address} (Agent: ${serverInfo.agent})`);
      })
      .catch(err => {
        isNeo4jConnected = false;
        lastError = err.message;
        console.warn(`[Neo4j] Note: Unable to reach Neo4j database (${err.message}). Application will continue with MongoDB and provide sync/retry options.`);
      });
  } catch (error) {
    isNeo4jConnected = false;
    lastError = error.message;
    console.warn(`[Neo4j] Driver initialization warning: ${error.message}`);
  }

  return driver;
};

const getNeo4jSession = (database) => {
  if (!driver) {
    initNeo4j();
  }
  const dbName = database || process.env.NEO4J_DATABASE || 'neo4j';
  return driver.session({ database: dbName });
};

const getNeo4jStatus = async () => {
  if (!driver) {
    return { connected: false, error: 'Driver not initialized' };
  }
  try {
    const serverInfo = await driver.verifyConnectivity();
    isNeo4jConnected = true;
    lastError = null;
    return {
      connected: true,
      address: serverInfo.address,
      agent: serverInfo.agent,
      database: process.env.NEO4J_DATABASE || 'neo4j'
    };
  } catch (err) {
    isNeo4jConnected = false;
    lastError = err.message;
    return {
      connected: false,
      error: err.message
    };
  }
};

const closeNeo4j = async () => {
  if (driver) {
    await driver.close();
    console.log('[Neo4j] Connection pool closed.');
  }
};

module.exports = {
  initNeo4j,
  getNeo4jSession,
  getNeo4jStatus,
  closeNeo4j,
  neo4j
};
