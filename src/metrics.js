const os = require('os');
const fetch = require('node-fetch');
const config = require('./config.js');

function getCpuUsagePercentage()
{
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage()
{
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2);
}

// Define metrics class to manage and report metrics to Grafana
class Metrics
{
  constructor()
  {
    this.totalRequests = 0;
    this.httpMethodCounts = { GET: 0, POST: 0, DELETE: 0, PUT: 0 };
    this.activeUsers = 0;
    this.authAttempts = { success: 0, failure: 0 };
    this.pizzaMetrics = { sold: 0, creationFailures: 0, revenue: 0 };
    this.latency = { service: 0, pizza: 0 };
  }

  httpMetrics(buf)
  {
    buf.addMetric('request', 'all', 'total', this.totalRequests);
    buf.addMetric('request', 'GET', 'total', this.httpMethodCounts.GET);
    buf.addMetric('request', 'POST', 'total', this.httpMethodCounts.POST);
    buf.addMetric('request', 'DELETE', 'total', this.httpMethodCounts.DELETE);
    buf.addMetric('request', 'PUT', 'total', this.httpMethodCounts.PUT);
  }

  systemMetrics(buf)
  {
    buf.addMetric('system', 'cpu', 'usage', getCpuUsagePercentage());
    buf.addMetric('system', 'memory', 'usage', getMemoryUsagePercentage());
  }

  userMetrics(buf)
  {
    buf.addMetric('activeUsers', 'all', 'total', this.activeUsers);
  }

  purchaseMetrics(buf)
  {
    buf.addMetric('pizza', 'sold', 'total', this.pizzaMetrics.sold);
    buf.addMetric('pizza', 'creationFailures', 'total', this.pizzaMetrics.creationFailures);
    buf.addMetric('pizza', 'revenue', 'total', this.pizzaMetrics.revenue);
  }

  authMetrics(buf)
  {
    buf.addMetric('auth', 'success', 'total', this.authAttempts.success);
    buf.addMetric('auth', 'failure', 'total', this.authAttempts.failure);
  }

  latencyMetrics(buf)
  {
    buf.addMetric('latency', 'service', 'total', this.latency.service);
    buf.addMetric('latency', 'pizza', 'total', this.latency.pizza);
  }

  sendMetricsPeriodically(period)
  {
    const timer = setInterval(() =>
    {
      try
      {
        const buf = new MetricBuilder();
        this.httpMetrics(buf);
        this.systemMetrics(buf);
        this.userMetrics(buf);
        this.purchaseMetrics(buf);
        this.authMetrics(buf);
        this.latencyMetrics(buf);

        const metrics = buf.toString('\n');
        this.sendMetricToGrafana(metrics).then(() => {
          this.resetLatencyMetrics();
        });
      } catch (error)
      {
        console.log('Error sending metrics', error);
      }
    }, period);

    timer.unref();
  }

  resetLatencyMetrics()
  {
    this.latency.service = 0;
    this.latency.pizza = 0;
  }

  
  sendMetricToGrafana(metric)
  {
    fetch(`${config.metrics.url}`, {
      method: 'post',
      body: metric,
      headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}` },
    })
      .then((response) =>
      {
        if (!response.ok)
        {
          console.error('Failed to push metrics data to Grafana');
          console.error(response);
        } else
        {
          console.log(`Pushed ${metric}`);
        }
      })
      .catch((error) =>
      {
        console.error('Error pushing metrics data to Grafana', error);
      });
  }

  // Increment the number of requests for the given HTTP method
  incrementRequests(method)
  {
    this.totalRequests++;
    if (this.httpMethodCounts[method] !== undefined)
    {
      this.httpMethodCounts[method]++;
    }
  }

  // Increment authentication attempts (success or failure)
  incrementAuthAttempts(success)
  {
    if (success)
    {
      this.authAttempts.success++;
    } else
    {
      this.authAttempts.failure++;
    }
  }

  // Increment pizza metrics
  incrementPizzaMetrics(sold, creationFailed, revenue)
  {
    if (sold) this.pizzaMetrics.sold++;
    if (creationFailed) this.pizzaMetrics.creationFailures++;
    if (revenue) this.pizzaMetrics.revenue += revenue;
  }

  // Increment Active Users
  incrementActiveUsers()
  {
    this.activeUsers++;
  }

  // Decrement Active Users
  decrementActiveUsers()
  {
    this.activeUsers--;
  }
}

class MetricBuilder {
  constructor() {
    this.metrics = [];
  }

  addMetric(metricPrefix, httpMethod, metricName, metricValue) {
    const metric = `${metricPrefix},source=${config.source},method=${httpMethod} ${metricName}=${metricValue}`;
    this.metrics.push(metric);
  }

  toString(separator) {
    return this.metrics.join(separator);
  }
}


// Create an instance of the Metrics class
const metrics = new Metrics();
metrics.sendMetricsPeriodically(10000);

// Middleware to track requests
function requestTracker(req, res, next)
{
  metrics.incrementRequests(req.method);
  next();
}

// Middleware to track latency
function latencyTracker(req, res, next)
{
  const start = Date.now();
  res.on('finish', () =>
  {
    const duration = Date.now() - start;
    metrics.latency.service = Math.max(metrics.latency.service, duration);
    if (req.originalUrl === '/api/order' && req.method === 'POST') {
      metrics.latency.pizza = Math.max(metrics.latency.pizza, duration);
    }
  });
  next();
}

// Export the metrics class and the middleware
module.exports = { metrics, requestTracker, latencyTracker };
