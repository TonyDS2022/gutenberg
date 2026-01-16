import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

// Disable rate limiting in development mode
const isDev = env.NODE_ENV !== 'production';

// Helper to create skip function
const skipInDev = () => isDev;

// General API rate limiter - 100 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 1000 : 100, // Higher limit in development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: skipInDev, // Disable in development
});

// Strict limiter for auth endpoints - 10 requests per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 50 : 10, // Higher limit in development
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  skip: skipInDev, // Disable in development
});

// Moderate limiter for search and read operations - 50 requests per 10 minutes
export const searchLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: isDev ? 500 : 50,
  message: 'Too many search requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDev, // Disable in development
});

// Lenient limiter for session tracking - 200 requests per 15 minutes
export const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 2000 : 200, // Higher limit for frequent progress updates
  message: 'Too many session updates, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDev, // Disable in development
});
