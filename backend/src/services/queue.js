import Queue from 'bull';
import path from 'path';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const wordlistQueue = new Queue('wordlist', REDIS_URL, {
  redis: REDIS_URL
});

export default {
  wordlistQueue
};
