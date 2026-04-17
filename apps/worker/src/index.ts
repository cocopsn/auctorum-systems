import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { MESSAGE_QUEUE_NAME, WhatsappMessagePayload } from '@quote-engine/events';
import { withTenant } from '@quote-engine/db';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

console.log(`[Worker] Starting message processor on queue: ${MESSAGE_QUEUE_NAME}`);

const worker = new Worker<WhatsappMessagePayload>(
  MESSAGE_QUEUE_NAME,
  async (job) => {
    const { tenantId, phone, phoneNumberId, text, timestamp, externalId } = job.data;
    console.log(`[Worker] Processing message job ${job.id} for tenant ${tenantId}`);

    try {
      // Isolate ALL DB operations globally in a strictly scoped context
      await withTenant(tenantId, async (tx) => {
        // Here we invoke the AI bot logic, RAG retrieval and message sending 
        // Previously this was inside the MedConcierge webhook processInBackground()
        
        // Pseudo-logic for illustration of the distributed jump
        // const { db } = tx;
        // await handleAiReplyWithFunctions(phone, ...)
      });
      return { status: 'success', tenantId, phone };
    } catch (err: any) {
      console.error(`[Worker] Failed job ${job.id}:`, err);
      throw err;
    }
  },
  { connection }
);

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});
