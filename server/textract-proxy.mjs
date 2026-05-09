import { createServer } from "node:http";
import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";

const port = Number.parseInt(process.env.TEXTRACT_PROXY_PORT ?? "8787", 10);
const region = process.env.AWS_REGION || "us-east-1";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!accessKeyId || !secretAccessKey) {
  console.error("Missing AWS credentials. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.local before starting the Textract proxy.");
  process.exit(1);
}

const textract = new TextractClient({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
  });
  response.end(JSON.stringify(payload));
}

function collectBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 404, { error: "Not found." });
    return;
  }

  if (request.method === "OPTIONS") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method !== "POST" || request.url !== "/api/ocr/textract") {
    sendJson(response, 404, { error: "Not found." });
    return;
  }

  try {
    const rawBody = await collectBody(request);
    const payload = JSON.parse(rawBody);
    const imageBase64 = typeof payload?.imageBase64 === "string" ? payload.imageBase64 : "";

    if (!imageBase64) {
      sendJson(response, 400, { error: "Missing imageBase64." });
      return;
    }

    const imageBytes = Buffer.from(imageBase64, "base64");
    if (imageBytes.length > 5 * 1024 * 1024) {
      sendJson(response, 400, {
        error: "Image is too large for Textract (5 MB limit). Try a tighter crop of just the label text, or reduce the image size before uploading.",
      });
      return;
    }

    const command = new DetectDocumentTextCommand({
      Document: { Bytes: imageBytes },
    });

    const result = await textract.send(command);
    const lines = (result.Blocks ?? [])
      .filter((block) => block.BlockType === "LINE" && block.Text)
      .map((block) => block.Text.trim())
      .filter(Boolean);
    const wordBlocksWithConfidence = (result.Blocks ?? []).filter(
      (block) => block.BlockType === "WORD" && typeof block.Confidence === "number",
    );
    const averageWordConfidence =
      wordBlocksWithConfidence.length > 0
        ? wordBlocksWithConfidence.reduce((total, block) => total + (block.Confidence ?? 0), 0) / wordBlocksWithConfidence.length
        : undefined;

    sendJson(response, 200, {
      text: lines.join("\n"),
      confidence: averageWordConfidence,
      lineCount: lines.length,
      wordCount: wordBlocksWithConfidence.length,
      provider: "aws-textract",
    });
  } catch (error) {
    console.error("Textract proxy failed.", error);
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Textract proxy failed.",
    });
  }
}).listen(port, () => {
  console.log(`Textract proxy listening on http://127.0.0.1:${port}/api/ocr/textract`);
});
