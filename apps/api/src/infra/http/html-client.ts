/** Technical seam: application code depends on MarketDataSource, not HTTP. */
export interface HtmlClient {
  get(url: string): Promise<string>;
}
