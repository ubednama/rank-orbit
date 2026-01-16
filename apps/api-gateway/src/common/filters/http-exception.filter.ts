import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
    } else if ((exception as any)?.status) {
      // Duck-typing for when instanceof check fails (e.g. package version mismatch)
      status = (exception as any).status;
    }

    // Fix for ThrottlerException sometimes losing its status or type
    if (status === 500 && (exception as any)?.message?.includes("ThrottlerException")) {
      status = HttpStatus.TOO_MANY_REQUESTS;
    }

    const message =
      exception instanceof HttpException ? exception.getResponse() : "Internal Server Error";

    // Enhance logging
    this.logger.error(
      `Http Status: ${status} Error Message: ${JSON.stringify(message)} Path: ${request.url}`,
      (exception as any).stack, // Log stack trace
    );

    // Standardized Error Response
    const errorResponse = {
      statusCode: status,
      message:
        typeof message === "object" && message !== null && "message" in message
          ? (message as { message: string }).message
          : message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Special handling for Service Unavailable/Bad Gateway cases if we want to expose "Service" field
    // But generic fallback is good enough for now.
    // The user requested: service: "crawler-service" etc.
    // If the exception message implies a specific service, we could parse it, but standard nesting is safer.

    response.status(status).json(errorResponse);
  }
}
