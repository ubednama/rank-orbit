import { FastifyInstance } from "fastify";
import { z } from "zod";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { CrawlService } from "./crawl.service";

const crawlService = new CrawlService();

const crawlRequestSchema = z.object({
  url: z.string().url("Must be a valid URL"),
});

export async function crawlRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  server.post(
    "/",
    {
      schema: {
        body: crawlRequestSchema,
      },
    },
    async (request, reply) => {
      const { url } = request.body as z.infer<typeof crawlRequestSchema>;

      try {
        const { page_content, metadata, readability_analysis } =
          await crawlService.extractMetadata(url);
        const lighthouse_metrics = await crawlService.runLighthouse(url);
        const technical_analysis = crawlService.calculateTechnicalAnalysis(lighthouse_metrics);

        return {
          page_content,
          metadata,
          lighthouse_metrics,
          readability_analysis,
          technical_analysis,
        };
      } catch (error: unknown) {
        const errMessage = error instanceof Error ? error.message : "Failed to crawl website";
        server.log.error({ err: error }, `Crawl Error for ${url}`);
        return reply.status(500).send({
          statusCode: 500,
          error: "Internal Server Error",
          message: errMessage,
        });
      }
    },
  );
}
