export const dynamic = 'force-dynamic';

import { auth } from "@/auth";
import { z } from "zod";

const testSchema = z.object({
  provider: z.enum(["postmark", "mailgun", "spaces"]),
  config: z.record(z.string())
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { provider, config } = testSchema.parse(await req.json());

  try {
    switch (provider) {
      case "postmark":
        return await testPostmark(config);
      case "mailgun":
        return await testMailgun(config);
      case "spaces":
        return await testSpaces(config);
      default:
        return Response.json({ error: "Unknown provider" }, { status: 400 });
    }
  } catch (error) {
    return Response.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Test failed" 
      },
      { status: 500 }
    );
  }
}

async function testPostmark(config: Record<string, string>) {
  const { POSTMARK_SERVER_TOKEN } = config;
  
  if (!POSTMARK_SERVER_TOKEN) {
    return Response.json(
      { error: "Postmark server token is required" },
      { status: 400 }
    );
  }

  // Test by calling the server info endpoint
  const response = await fetch("https://api.postmarkapp.com/server", {
    headers: {
      "Accept": "application/json",
      "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN
    }
  });

  if (!response.ok) {
    const error = await response.text();
    return Response.json(
      { success: false, error: `Postmark API error: ${error}` },
      { status: 400 }
    );
  }

  const data = await response.json();
  return Response.json({
    success: true,
    message: "Postmark connection successful",
    details: {
      serverName: data.Name,
      serverId: data.ID
    }
  });
}

async function testMailgun(config: Record<string, string>) {
  const { MAILGUN_DOMAIN, MAILGUN_API_KEY } = config;
  
  if (!MAILGUN_DOMAIN || !MAILGUN_API_KEY) {
    return Response.json(
      { error: "Mailgun domain and API key are required" },
      { status: 400 }
    );
  }

  // Test by getting domain info
  const auth = Buffer.from(`api:${MAILGUN_API_KEY}`).toString("base64");
  const response = await fetch(
    `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}`,
    {
      headers: {
        "Authorization": `Basic ${auth}`,
        "Accept": "application/json"
      }
    }
  );

  if (!response.ok) {
    const error = await response.text();
    return Response.json(
      { success: false, error: `Mailgun API error: ${error}` },
      { status: 400 }
    );
  }

  const data = await response.json();
  return Response.json({
    success: true,
    message: "Mailgun connection successful",
    details: {
      domain: data.domain?.name,
      state: data.domain?.state
    }
  });
}

async function testSpaces(config: Record<string, string>) {
  const { SPACES_REGION, SPACES_ENDPOINT, SPACES_BUCKET, SPACES_ACCESS_KEY, SPACES_SECRET_KEY } = config;
  
  if (!SPACES_REGION || !SPACES_ENDPOINT || !SPACES_BUCKET || !SPACES_ACCESS_KEY || !SPACES_SECRET_KEY) {
    return Response.json(
      { error: "All Spaces configuration values are required" },
      { status: 400 }
    );
  }

  // Import S3 client dynamically to avoid issues if not configured
  const { S3Client, ListObjectsV2Command } = await import("@aws-sdk/client-s3");
  
  const client = new S3Client({
    region: SPACES_REGION,
    endpoint: SPACES_ENDPOINT,
    credentials: {
      accessKeyId: SPACES_ACCESS_KEY,
      secretAccessKey: SPACES_SECRET_KEY
    },
    forcePathStyle: false
  });

  try {
    // Try to list objects (limit 1) to verify connection
    const command = new ListObjectsV2Command({
      Bucket: SPACES_BUCKET,
      MaxKeys: 1
    });
    
    await client.send(command);
    
    return Response.json({
      success: true,
      message: "Spaces connection successful",
      details: {
        bucket: SPACES_BUCKET,
        region: SPACES_REGION
      }
    });
  } catch (error) {
    return Response.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Spaces connection failed"
      },
      { status: 400 }
    );
  }
}
