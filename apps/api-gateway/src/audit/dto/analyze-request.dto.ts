import { IsNotEmpty, IsObject, IsString, IsNumber, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { LighthouseMetrics, ImageInfo, SeoMetadata } from '@shared/types';

export class LighthouseMetricsDto implements LighthouseMetrics {
  @IsNumber()
  performance_score: number;

  @IsNumber()
  accessibility_score: number;

  @IsOptional()
  @IsString()
  lcp: string;

  @IsOptional()
  @IsString()
  cls: string;

  @IsOptional()
  @IsString()
  tbt: string;

  @IsOptional()
  @IsString()
  fcp: string;

  @IsOptional()
  @IsString()
  speed_index: string;

  @IsOptional()
  @IsString()
  error?: string;
}

export class ImageDto implements ImageInfo {
  @IsString()
  src: string;

  @IsString()
  alt: string;
}

export class PageMetadataDto implements SeoMetadata {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  h1: string[];

  @IsArray()
  @IsString({ each: true })
  h2: string[];

  @IsArray()
  @IsString({ each: true })
  h3: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageDto)
  images: ImageDto[];

  @IsNumber()
  missing_alt_count: number;
}

export class AnalyzeRequestDto {
  @IsNotEmpty()
  @IsString()
  page_content: string;

  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => PageMetadataDto)
  metadata: PageMetadataDto;

  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => LighthouseMetricsDto)
  lighthouse_metrics: LighthouseMetricsDto;
}
