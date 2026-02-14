
// Use explicit npm imports to avoid Deno resolution issues
import { PutObjectCommand, S3Client } from "npm:@aws-sdk/client-s3@3.454.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.454.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Manual Auth Check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
       return new Response(JSON.stringify({ error: 'Unauthorized: Missing Auth Header' }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Parse Body
    let body;
    try {
        body = await req.json();
    } catch (e) {
         return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }
    
    const { filename, contentType } = body;
    if (!filename || !contentType) {
        return new Response(JSON.stringify({ error: `Missing params. filename: ${filename}, contentType: ${contentType}` }), { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }

    // Get secrets from Environment Variables
    const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID');
    const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID');
    const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY');
    const R2_BUCKET_NAME = Deno.env.get('R2_BUCKET_NAME') || 'videoshopping';
    const R2_PUBLIC_DOMAIN = Deno.env.get('R2_PUBLIC_DOMAIN');

    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
       console.error("Missing R2 Config Secrets");
       return new Response(JSON.stringify({ error: 'Server misconfiguration: Missing R2 Secrets' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Init S3 Client
    const S3 = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });

    const key = `${Date.now()}_${filename.replace(/\s+/g, '-')}`;
    
    // 4. Generate URL
    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000',
    });

    const uploadUrl = await getSignedUrl(S3, command, { expiresIn: 3600 });
    
    const publicUrl = R2_PUBLIC_DOMAIN 
        ? `${R2_PUBLIC_DOMAIN}/${key}` 
        : `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${key}`;

    return new Response(
      JSON.stringify({ 
          uploadUrl, 
          publicUrl, 
          key 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Critical Error:", error);
    return new Response(JSON.stringify({ 
        error: error.message || 'Unknown Error',
        stack: error.stack
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
