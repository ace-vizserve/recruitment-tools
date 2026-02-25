import { RateLimiterMemory } from "rate-limiter-flexible";

export const checkRateLimit = new RateLimiterMemory({
  points: 5,
  duration: 60,
  blockDuration: 300,
});
