import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

/** Shared Redis connection for queues (reused across createQueue calls). */
let sharedConnection: IORedis | null = null;

function getConnection(): IORedis {
  if (!sharedConnection) {
    sharedConnection = new IORedis(REDIS_PORT, REDIS_HOST, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return sharedConnection;
}

// --------------- Queue factory ---------------

export type AuctorumJobName =
  | 'message.received'
  | 'appointment.created'
  | 'reminder.triggered';

export interface AuctorumJobPayload {
  tenant_id: string;
  [key: string]: unknown;
}

export function createQueue(name: string) {
  return new Queue<AuctorumJobPayload>(name, {
    connection: getConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 200 },
    },
  });
}

// --------------- Worker factory ---------------

export type JobProcessor = (job: Job<AuctorumJobPayload>) => Promise<void>;

export function createWorker(
  queueName: string,
  processor: JobProcessor,
  concurrency = 3,
) {
  const worker = new Worker<AuctorumJobPayload>(queueName, async (job) => {
    const started = Date.now();
    const tenantId = job.data.tenant_id ?? 'unknown';
    console.log(`[worker:${queueName}] START job=${job.id} tenant=${tenantId} name=${job.name}`);
    try {
      await processor(job);
      console.log(`[worker:${queueName}] DONE  job=${job.id} tenant=${tenantId} elapsed=${Date.now() - started}ms`);
    } catch (err) {
      console.error(
        `[worker:${queueName}] FAIL  job=${job.id} tenant=${tenantId} attempt=${job.attemptsMade} elapsed=${Date.now() - started}ms`,
        err instanceof Error ? err.message : err,
      );
      throw err;
    }
  }, {
    connection: getConnection(),
    concurrency,
  });

  worker.on('error', (err) => {
    console.error(`[worker:${queueName}] Worker error:`, err.message);
  });

  return worker;
}

// --------------- Graceful shutdown ---------------

export async function closeAll() {
  if (sharedConnection) {
    await sharedConnection.quit();
    sharedConnection = null;
  }
}

export { Queue, Worker, Job } from 'bullmq';
