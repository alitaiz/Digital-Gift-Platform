
// To address TypeScript errors when @cloudflare/workers-types is not available,
// we'll provide minimal type definitions for the Cloudflare environment.
// In a real-world project, you should `npm install -D @cloudflare/workers-types`
// and configure it in `tsconfig.json`.
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

interface R2Bucket {
  // R2 binding object does not directly expose bucketName to the code
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

import { S3Client, PutObjectCommand, DeleteObjectsCommand, DeleteObjectsCommandOutput } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface Env {
  // Bindings
  GIFTS_KV: KVNamespace;
  GIFTS_BUCKET: R2Bucket;

  // Secrets
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_PUBLIC_URL: string;
  
  // Environment Variables (from wrangler.toml `[vars]`)
  R2_BUCKET_NAME: string;
}

interface Gift {
  slug: string;
  recipientName: string;
  greeting: string;
  message: string;
  images: string[]; // Array of public image URLs
  createdAt: string;
  editKey: string; // The secret key
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Edit-Key",
};

const getR2Client = (env: Env) => {
  return new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
};


export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // --- Environment Sanity Check ---
    // This check prevents silent crashes if the worker is not configured correctly.
    if (!env.GIFTS_KV || !env.GIFTS_BUCKET || !env.R2_BUCKET_NAME || !env.R2_PUBLIC_URL || !env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
      console.error("CRITICAL: Worker environment is not configured correctly. Bindings or secrets are missing. Check your wrangler.toml and Cloudflare dashboard settings.");
      return new Response(JSON.stringify({ error: "Server configuration error. The service is temporarily unavailable." }), {
        status: 503, // Service Unavailable
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    if (request.method === "OPTIONS") {
      // Respond to CORS preflight requests.
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // --- Simple Router ---

    // The AI rewrite endpoint is handled by the dedicated proxy server.

    // POST /api/upload-url: Generates a secure URL for the frontend to upload a file directly to R2.
    if (request.method === "POST" && path === "/api/upload-url") {
      try {
        if (!env.R2_BUCKET_NAME) {
          throw new Error("Configuration error: R2_BUCKET_NAME is not set in wrangler.toml under [vars].");
        }
        
        const { filename, contentType } = await request.json() as { filename: string; contentType: string; };
        if (!filename || !contentType) {
          return new Response(JSON.stringify({ error: 'Filename and contentType are required' }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }});
        }
        
        const s3 = getR2Client(env);
        const fileExtension = filename.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const uniqueKey = `${crypto.randomUUID()}.${fileExtension}`;

        const signedUrl = await getSignedUrl(s3, new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: uniqueKey, ContentType: contentType }), { expiresIn: 360 });
        const publicBaseUrl = env.R2_PUBLIC_URL.endsWith('/') ? env.R2_PUBLIC_URL.slice(0, -1) : env.R2_PUBLIC_URL;
        const publicUrl = `${publicBaseUrl}/${uniqueKey}`;

        return new Response(JSON.stringify({ uploadUrl: signedUrl, publicUrl: publicUrl }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch(e) {
        console.error("Error generating upload URL:", e);
        const errorDetails = e instanceof Error ? e.message : String(e);
        return new Response(JSON.stringify({ error: `Worker Error: ${errorDetails}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // POST /api/gifts/list: Get summary data for multiple gifts.
    if (request.method === "POST" && path === "/api/gifts/list") {
        try {
            const { slugs } = await request.json() as { slugs: string[] };
            if (!Array.isArray(slugs)) {
                return new Response(JSON.stringify({ error: 'Request body must be an object with a "slugs" array.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
            }
            
            const kvPromises = slugs.map(slug => env.GIFTS_KV.get(slug));
            const results = await Promise.all(kvPromises);
            
            const summaries = results
                .filter(json => json !== null)
                .map(json => {
                    const gift: Gift = JSON.parse(json!);
                    return {
                        slug: gift.slug,
                        recipientName: gift.recipientName,
                        createdAt: gift.createdAt
                    };
                });

            return new Response(JSON.stringify(summaries), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        } catch (e) {
            console.error("Error in /api/gifts/list:", e);
            const errorDetails = e instanceof Error ? e.message : "Bad Request or Internal Error";
            return new Response(JSON.stringify({ error: errorDetails }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
    }

    // POST /api/gift: Creates a new gift record in KV.
    if (request.method === "POST" && path === "/api/gift") {
      try {
        const newGift: Gift = await request.json();
        if (!newGift.slug || !newGift.recipientName || !newGift.editKey) {
            return new Response(JSON.stringify({ error: 'Slug, Recipient Name, and Edit Key are required.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
        }
        const existing = await env.GIFTS_KV.get(newGift.slug);
        if (existing !== null) {
          return new Response(JSON.stringify({ error: `Slug "${newGift.slug}" already exists.` }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        // Store the complete object including the editKey
        await env.GIFTS_KV.put(newGift.slug, JSON.stringify(newGift));
        return new Response(JSON.stringify({ success: true, slug: newGift.slug }), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Bad Request or Internal Error" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Routes for /api/gift/:slug
    if (path.startsWith("/api/gift/")) {
      const slug = path.substring("/api/gift/".length);
      if (!slug) return new Response("Not Found", { status: 404 });

      // GET /api/gift/:slug: Retrieves a gift.
      if (request.method === "GET") {
        const giftJson = await env.GIFTS_KV.get(slug);
        if (giftJson === null) {
          return new Response(JSON.stringify({ error: "Gift not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        // SECURITY: Omit editKey before sending to client
        const gift: Partial<Gift> = JSON.parse(giftJson);
        delete gift.editKey;
        return new Response(JSON.stringify(gift), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      
      // PUT /api/gift/:slug: Updates an existing gift.
      if (request.method === "PUT") {
          const editKey = request.headers.get('X-Edit-Key');
          if (!editKey) {
              return new Response(JSON.stringify({ error: 'Authentication required. Edit key missing.' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }

          try {
              if (!env.R2_BUCKET_NAME) {
                  throw new Error("Configuration error: R2_BUCKET_NAME is not set.");
              }
              const giftJson = await env.GIFTS_KV.get(slug);
              if (!giftJson) {
                  return new Response(JSON.stringify({ error: 'Gift not found.' }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
              }

              const storedGift: Gift = JSON.parse(giftJson);
              if (storedGift.editKey !== editKey) {
                  return new Response(JSON.stringify({ error: 'Forbidden. Invalid edit key.' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
              }
              
              const updateData: Partial<Gift> = await request.json();

              // --- Robust Image Deletion Logic ---
              // The old list of images from KV
              const originalImageUrls = storedGift.images || [];
              // The new list of images from the client request
              const newImageUrls = new Set(updateData.images || []);

              // Find URLs that were in the old list but are not in the new list
              const imagesToDelete = originalImageUrls.filter(url => !newImageUrls.has(url));
              
              if (imagesToDelete.length > 0) {
                  const s3 = getR2Client(env);
                  const objectKeys = imagesToDelete.map(imageUrl => {
                      try {
                          // Extract path and remove leading slash to get the key
                          const key = new URL(imageUrl).pathname.substring(1);
                          if (key) return { Key: key };
                          return null;
                      } catch (e) {
                          console.error(`[Update] Invalid URL encountered during diff for slug ${slug}: ${imageUrl}`, e);
                          return null;
                      }
                  }).filter((obj): obj is { Key: string } => obj !== null && obj.Key !== '');

                  if (objectKeys.length > 0) {
                      const deleteResult: DeleteObjectsCommandOutput = await s3.send(new DeleteObjectsCommand({
                          Bucket: env.R2_BUCKET_NAME,
                          Delete: { Objects: objectKeys },
                      }));
                      if (deleteResult.Errors && deleteResult.Errors.length > 0) {
                          console.error(`[Update] Errors deleting objects from R2 for slug ${slug}:`, deleteResult.Errors);
                          const errorMessages = deleteResult.Errors.map(e => `${e.Key}: ${e.Message}`).join(', ');
                          // Fail fast if R2 deletion fails
                          throw new Error(`Failed to remove old images from storage: ${errorMessages}`);
                      }
                  }
              }

              // Update the gift in KV with the new data
              const updatedGift: Gift = {
                  ...storedGift,
                  recipientName: updateData.recipientName ?? storedGift.recipientName,
                  greeting: updateData.greeting ?? storedGift.greeting,
                  message: updateData.message ?? storedGift.message,
                  images: updateData.images ?? storedGift.images,
              };

              await env.GIFTS_KV.put(slug, JSON.stringify(updatedGift));

              const publicGiftData = { ...updatedGift };
              delete (publicGiftData as Partial<Gift>).editKey;

              return new Response(JSON.stringify(publicGiftData), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

          } catch (e) {
              const errorDetails = e instanceof Error ? e.message : String(e);
              console.error(`[Update] Critical failure during update of slug ${slug}:`, errorDetails);
              return new Response(JSON.stringify({ error: `Failed to update gift. ${errorDetails}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
      }

      // DELETE /api/gift/:slug: Permanently deletes a gift and its images.
      if (request.method === "DELETE") {
        const editKey = request.headers.get('X-Edit-Key');
        if (!editKey) {
          return new Response(JSON.stringify({ error: 'Authentication required. Edit key missing.' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        try {
          if (!env.R2_BUCKET_NAME) {
              throw new Error("Configuration error: R2_BUCKET_NAME is not set.");
          }
          const giftJson = await env.GIFTS_KV.get(slug);

          if (!giftJson) {
            // Gift already gone, consider it a success.
            return new Response(null, { status: 204, headers: corsHeaders });
          }

          const gift: Gift = JSON.parse(giftJson);
          
          // SECURITY: Check if the provided key matches the stored key
          if (gift.editKey !== editKey) {
            return new Response(JSON.stringify({ error: 'Forbidden. Invalid edit key.' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          
          // If keys match, proceed with deletion of R2 objects first
          if (gift.images && gift.images.length > 0) {
            const s3 = getR2Client(env);
            const objectKeys = gift.images.map(imageUrl => {
                try {
                  return { Key: new URL(imageUrl).pathname.substring(1) };
                } catch { return null; }
            }).filter((obj): obj is { Key: string } => obj !== null && obj.Key !== '');
            
            if (objectKeys.length > 0) {
               const deleteResult: DeleteObjectsCommandOutput = await s3.send(new DeleteObjectsCommand({
                Bucket: env.R2_BUCKET_NAME,
                Delete: { Objects: objectKeys },
              }));
              if (deleteResult.Errors && deleteResult.Errors.length > 0) {
                  console.error(`[Delete] Errors deleting objects from R2 for slug ${slug}:`, deleteResult.Errors);
                  const errorMessages = deleteResult.Errors.map(e => `${e.Key}: ${e.Message}`).join(', ');
                  // Throw an error to prevent deleting the KV entry if images fail to delete.
                  throw new Error(`Failed to delete images from storage: ${errorMessages}`);
              }
            }
          }
          
          // Only delete KV entry after R2 objects are successfully deleted
          await env.GIFTS_KV.delete(slug);
          return new Response(null, { status: 204, headers: corsHeaders });

        } catch (e) {
          const errorDetails = e instanceof Error ? e.message : String(e);
          console.error(`[Delete] Critical failure during deletion of slug ${slug}:`, errorDetails);
          return new Response(JSON.stringify({ error: `Failed to delete gift from storage. ${errorDetails}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};
