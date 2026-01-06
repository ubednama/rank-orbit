import {
  IsNotEmpty,
  IsObject,
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";
import { LighthouseMetrics, ImageInfo, SeoMetadata } from "@shared/types";
import { ApiProperty } from "@nestjs/swagger";

export class LighthouseMetricsDto implements LighthouseMetrics {
  @ApiProperty({ example: 95, description: "Performance score from Lighthouse" })
  @IsNumber()
  performance_score: number;

  @ApiProperty({ example: 100, description: "Accessibility score from Lighthouse" })
  @IsNumber()
  accessibility_score: number;

  @ApiProperty({ example: "1.2s", required: false, description: "Largest Contentful Paint" })
  @IsOptional()
  @IsString()
  lcp: string;

  @ApiProperty({ example: "0.01", required: false, description: "Cumulative Layout Shift" })
  @IsOptional()
  @IsString()
  cls: string;

  @ApiProperty({ example: "100ms", required: false, description: "Total Blocking Time" })
  @IsOptional()
  @IsString()
  tbt: string;

  @ApiProperty({ example: "0.8s", required: false, description: "First Contentful Paint" })
  @IsOptional()
  @IsString()
  fcp: string;

  @ApiProperty({ example: "1.5s", required: false, description: "Speed Index" })
  @IsOptional()
  @IsString()
  speed_index: string;

  @ApiProperty({
    example: "Error running lighthouse",
    required: false,
    description: "Error message if lighthouse failed",
  })
  @IsOptional()
  @IsString()
  error?: string;
}

export class ImageDto implements ImageInfo {
  @ApiProperty({ example: "https://example.com/image.jpg", description: "Image source URL" })
  @IsString()
  src: string;

  @ApiProperty({ example: "A description of the image", description: "Image alt text" })
  @IsString()
  alt: string;
}

export class PageMetadataDto implements SeoMetadata {
  @ApiProperty({ example: "Example Page Title", description: "Page title" })
  @IsString()
  title: string;

  @ApiProperty({
    example: "This is an example description for SEO.",
    description: "Page meta description",
  })
  @IsString()
  description: string;

  @ApiProperty({ example: ["Main Header"], description: "List of H1 tags" })
  @IsArray()
  @IsString({ each: true })
  h1: string[];

  @ApiProperty({ example: ["Sub Header 1", "Sub Header 2"], description: "List of H2 tags" })
  @IsArray()
  @IsString({ each: true })
  h2: string[];

  @ApiProperty({ example: ["Section 1", "Section 2"], description: "List of H3 tags" })
  @IsArray()
  @IsString({ each: true })
  h3: string[];

  @ApiProperty({ type: [ImageDto], description: "List of images found on the page" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageDto)
  images: ImageDto[];

  @ApiProperty({ example: 2, description: "Count of images missing alt tags" })
  @IsNumber()
  missing_alt_count: number;
}

export class AnalyzeRequestDto {
  @ApiProperty({
    example: "<html><body><h1>Hello World</h1></body></html>",
    description: "Raw HTML content of the page",
  })
  @IsNotEmpty()
  @IsString()
  page_content: string;

  @ApiProperty({ type: PageMetadataDto, description: "Extracted metadata from the page" })
  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => PageMetadataDto)
  metadata: PageMetadataDto;

  @ApiProperty({ type: LighthouseMetricsDto, description: "Lighthouse performance metrics" })
  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => LighthouseMetricsDto)
  lighthouse_metrics: LighthouseMetricsDto;
}
