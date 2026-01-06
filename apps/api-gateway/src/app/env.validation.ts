import { plainToInstance } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, IsString, IsUrl, validateSync } from "class-validator";

export enum Environment {
  Development = "development",
  Production = "production",
  Test = "test",
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT = 3333;

  @IsUrl({ require_tld: false })
  @IsString()
  CRAWLER_SERVICE_URL: string;

  @IsUrl({ require_tld: false })
  @IsString()
  AI_SERVICE_URL: string;

  @IsString()
  @IsOptional()
  CORS_ORIGINS = 'http://localhost:4200,http://localhost:3000';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
