import axios from "axios";

describe("Crawler Service E2E", () => {
  it("should pass health check", async () => {
    const res = await axios.get(`/health`);
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ status: 'ok', service: 'crawler-service', timestamp: expect.any(String) });
  });

  it("should fail validation when crawl url is missing", async () => {
    try {
      await axios.post(`/api/crawl`, {});
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.message).toContain('url must be a URL address');
    }
  });
});
