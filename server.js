const cluster = require('cluster');
const os = require('os');
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '2000', 10);
const singleCore = process.env.SINGLE_CORE === 'true';

if (cluster.isPrimary && !singleCore) {
  const numCPUs = os.cpus().length;
  console.log(`[Cluster] Primary process ${process.pid} is running.`);
  console.log(`[Cluster] Forking ${numCPUs} workers across all CPU cores on port ${port}...`);

  const workerInstances = new Map();

  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork({ NODE_APP_INSTANCE: String(i) });
    workerInstances.set(worker.id, i);
  }

  cluster.on('exit', (worker, code, signal) => {
    const instanceIndex = workerInstances.get(worker.id) ?? 0;
    workerInstances.delete(worker.id);
    console.warn(
      `[Cluster] Worker ${worker.process.pid} (instance #${instanceIndex}) died (code: ${code}, signal: ${signal}). Respawning...`
    );
    const newWorker = cluster.fork({ NODE_APP_INSTANCE: String(instanceIndex) });
    workerInstances.set(newWorker.id, instanceIndex);
  });
} else {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  app.prepare().then(() => {
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    }).listen(port, (err) => {
      if (err) throw err;
      const instanceId = process.env.NODE_APP_INSTANCE || '0';
      console.log(`> [Worker ${process.pid} | Instance #${instanceId}] Ready on http://${hostname}:${port}`);
    });
  });
}

