const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-proto');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-proto');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');

const traceExporter = new OTLPTraceExporter({
  url: `${process.env.DT_OTLP_ENDPOINT}/v1/traces`,
  headers: {
    Authorization: `Api-Token ${process.env.DT_API_TOKEN}`,
  },
});

const metricExporter = new OTLPMetricExporter({
  url: `${process.env.DT_OTLP_ENDPOINT}/v1/metrics`,
  headers: {
    Authorization: `Api-Token ${process.env.DT_API_TOKEN}`,
  },
});

const sdk = new NodeSDK({
  traceExporter,

  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 10000,
  }),

  instrumentations: [
    getNodeAutoInstrumentations(),
  ],
});

sdk.start();

console.log('OpenTelemetry initialized');