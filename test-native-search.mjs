import test from "node:test";
import assert from "node:assert/strict";
import { parseGeminiGroundingChunks } from "./index.js";

test("parseGeminiGroundingChunks extracts grounding chunks with title and snippet", () => {
  const mockResponse = {
    candidates: [
      {
        content: {
          parts: [{ text: "The Boston Celtics won the NBA Finals." }]
        },
        groundingMetadata: {
          webSearchQueries: ["2024 nba finals winner"],
          groundingChunks: [
            {
              web: {
                uri: "https://en.wikipedia.org/wiki/2024_NBA_Finals",
                title: "2024 NBA Finals - Wikipedia"
              }
            },
            {
              web: {
                uri: "https://www.nba.com/news/celtics-champions-2024",
                title: "Celtics win 2024 championship"
              }
            }
          ],
          groundingSupports: [
            {
              segment: { text: "The Boston Celtics won the NBA Finals." },
              groundingChunkIndices: [0, 1]
            }
          ]
        }
      }
    ]
  };

  const result = parseGeminiGroundingChunks(mockResponse, 10);
  assert.equal(result.sources.length, 2);
  assert.equal(result.sources[0].url, "https://en.wikipedia.org/wiki/2024_NBA_Finals");
  assert.equal(result.sources[0].title, "2024 NBA Finals - Wikipedia");
  assert.equal(result.sources[0].snippet, "The Boston Celtics won the NBA Finals.");
  assert.equal(result.sources[1].url, "https://www.nba.com/news/celtics-champions-2024");
  assert.equal(result.truncated, false);
});

test("parseGeminiGroundingChunks respects maxResults limit", () => {
  const mockResponse = {
    candidates: [
      {
        groundingMetadata: {
          groundingChunks: [
            { web: { uri: "https://example.com/1", title: "1" } },
            { web: { uri: "https://example.com/2", title: "2" } },
            { web: { uri: "https://example.com/3", title: "3" } }
          ]
        }
      }
    ]
  };

  const result = parseGeminiGroundingChunks(mockResponse, 2);
  assert.equal(result.sources.length, 2);
  assert.equal(result.truncated, true);
});

test("parseGeminiGroundingChunks falls back to markdown links when groundingChunks absent", () => {
  const mockResponse = {
    candidates: [
      {
        content: {
          parts: [{ text: "See [Official Docs](https://ai.google.dev) for more details." }]
        }
      }
    ]
  };

  const result = parseGeminiGroundingChunks(mockResponse, 5);
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].url, "https://ai.google.dev");
  assert.equal(result.sources[0].title, "Official Docs");
});
