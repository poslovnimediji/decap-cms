/**
 * Rate limit info type and callback
 */
export interface RateLimitCallback {
  (rateLimitInfo: RateLimitInfo): void;
}

export interface RateLimitInfo {
  used: number;
  limit: number;
  remaining: number;
  reset: number;
  resource: string;
}

/**
 * Extracts rate limit information from response headers
 */
export function extractRateLimitInfo(headers: Headers): RateLimitInfo | null {
  const used = headers.get('x-ratelimit-used');
  const limit = headers.get('x-ratelimit-limit');
  const remaining = headers.get('x-ratelimit-remaining');
  const reset = headers.get('x-ratelimit-reset');
  const resource = headers.get('x-ratelimit-resource');

  if (!used || !limit || !remaining || !reset || !resource) {
    return null;
  }

  return {
    used: parseInt(used, 10),
    limit: parseInt(limit, 10),
    remaining: parseInt(remaining, 10),
    reset: parseInt(reset, 10),
    resource,
  };
}
