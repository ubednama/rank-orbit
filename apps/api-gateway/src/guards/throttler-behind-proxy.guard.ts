import { Injectable, Inject } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  ThrottlerGuard,
  ThrottlerException,
  ThrottlerRequest,
  ThrottlerModuleOptions,
  ThrottlerStorage,
  getOptionsToken,
  getStorageToken,
} from "@nestjs/throttler";

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  constructor(
    @Inject(getOptionsToken()) protected readonly options: ThrottlerModuleOptions,
    @Inject(getStorageToken()) protected readonly storageService: ThrottlerStorage,
    protected readonly reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // If authenticated, use sub (UserId), else use IP
    return req?.user?.sub || (req?.ips?.length ? req.ips[0] : req.ip);
  }

  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    try {
      const { context, throttler, getTracker, generateKey } = requestProps;

      const req = context.switchToHttp().getRequest();
      const tracker = await getTracker(req, context);

      // Define Throttler name (default to 'default')
      const throttlerName = throttler.name ?? "default";

      // Generate the key: ratelimit:{tracker}
      const key = generateKey(context, tracker, throttlerName);

      // Determine Limits based on Auth status
      // Authenticated: 3 requests / 30 days
      // Anonymous: 1 request / 30 days
      const isAuth = !!req?.user;
      const effectiveLimit = isAuth ? 3 : 1;

      const effectiveTtl = 2592000000; // 30 days in milliseconds

      const { totalHits, timeToExpire } = await this.storageService.increment(
        key,
        effectiveTtl,
        effectiveLimit,
        effectiveTtl, // blockDuration
        throttlerName,
      );

      // Logging for debugging (will remove later or keep as debug)
      console.log(
        `[RateLimit] Tracker: ${tracker}, Key: ${key}, Hits: ${totalHits}, Limit: ${effectiveLimit}`,
      );

      // Enforce Limit
      if (totalHits > effectiveLimit) {
        throw new ThrottlerException();
      }

      // Set Headers for Client visibility
      const res = context.switchToHttp().getResponse();
      res.header("X-RateLimit-Limit", effectiveLimit);
      res.header("X-RateLimit-Remaining", Math.max(0, effectiveLimit - totalHits));
      res.header("X-RateLimit-Reset", Math.ceil(timeToExpire / 1000));

      return true;
    } catch (err) {
      console.error("[ThrottlerBehindProxyGuard] Error details:", err);
      throw err;
    }
  }
}
