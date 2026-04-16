import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const MESSAGE_QUEUE_NAME = 'whatsapp_messages';

export const messageQueue = new Queue(MESSAGE_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

export const messageEvents = new QueueEvents(MESSAGE_QUEUE_NAME, { connection });

// Types
export interface WhatsappMessagePayload {
  tenantId: string;
  phone: string;
  phoneNumberId: string;
  text: string;
  externalId: string | null;
  timestamp: string | undefined;
}
