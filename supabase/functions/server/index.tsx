import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Initialize Supabase Storage bucket for profile photos
const initializeStorage = async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const bucketName = 'make-e44554cb-profile-photos';
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 5242880, // 5MB
      });
      console.log(`Created storage bucket: ${bucketName}`);
    }
  } catch (error) {
    console.log(`Storage initialization error: ${error}`);
  }
};

// Initialize storage on startup (non-blocking)
initializeStorage().catch(err => console.log('Storage init failed:', err));

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Access-Token"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Helper function to verify user from access token
async function getUserFromToken(accessToken: string | undefined) {
  if (!accessToken) {
    return null;
  }
  
  try {
    // Create a Supabase client with SERVICE_ROLE_KEY to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error) {
      console.log(`Auth error: ${error.message}`);
      return null;
    }
    
    return user;
  } catch (error) {
    console.log(`getUserFromToken error: ${error}`);
    return null;
  }
}

// Helper to extract access token from custom header (to bypass Supabase infrastructure JWT validation)
function getAccessToken(c: any): string | undefined {
  const customHeader = c.req.header('X-Access-Token');
  if (customHeader) return customHeader;

  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.split(' ')[1];

  return undefined;
}

// Health check endpoint
app.get("/make-server-e44554cb/health", (c) => {
  return c.json({ status: "ok" });
});

// Signup endpoint
app.post("/make-server-e44554cb/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: name || '' },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log(`Signup error: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ user: data.user });
  } catch (error) {
    console.log(`Signup exception: ${error}`);
    return c.json({ error: "Failed to create account" }, 500);
  }
});

// Save beat endpoint (requires auth)
app.post("/make-server-e44554cb/beats/save", async (c) => {
  try {
    const accessToken = getAccessToken(c);
    const user = await getUserFromToken(accessToken);
    
    if (!user) {
      console.log(`Save beat authorization error: No user found`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { beatName, pattern, tempo } = await c.req.json();
    
    if (!beatName || !pattern) {
      console.log(`Save beat validation error: Missing beatName or pattern`);
      return c.json({ error: "Beat name and pattern are required" }, 400);
    }

    const beatId = `beat_${user.id}_${Date.now()}`;
    const beatData = {
      id: beatId,
      userId: user.id,
      name: beatName,
      pattern,
      tempo,
      createdAt: new Date().toISOString(),
    };

    console.log(`Saving beat ${beatId} for user ${user.id}`);
    await kv.set(beatId, beatData);
    console.log(`Beat ${beatId} saved successfully`);

    return c.json({ success: true, beatId });
  } catch (error) {
    console.log(`Save beat exception: ${error}`);
    console.log(`Error stack: ${error.stack}`);
    return c.json({ error: `Failed to save beat: ${error.message}` }, 500);
  }
});

// Get user's beats endpoint (requires auth)
app.get("/make-server-e44554cb/beats", async (c) => {
  try {
    const accessToken = getAccessToken(c);
    const user = await getUserFromToken(accessToken);
    
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const allBeats = await kv.getByPrefix(`beat_${user.id}_`);
    
    return c.json({ beats: allBeats });
  } catch (error) {
    console.log(`Get beats error: ${error}`);
    return c.json({ error: "Failed to retrieve beats" }, 500);
  }
});

// Delete beat endpoint (requires auth)
app.delete("/make-server-e44554cb/beats/:beatId", async (c) => {
  try {
    const accessToken = getAccessToken(c);
    const beatId = c.req.param('beatId');
    const user = await getUserFromToken(accessToken);
    
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Verify the beat belongs to the user
    if (!beatId.startsWith(`beat_${user.id}_`)) {
      return c.json({ error: "Unauthorized to delete this beat" }, 403);
    }

    await kv.del(beatId);

    return c.json({ success: true });
  } catch (error) {
    console.log(`Delete beat error: ${error}`);
    return c.json({ error: "Failed to delete beat" }, 500);
  }
});


// Upload profile photo endpoint (requires auth)
app.post("/make-server-e44554cb/profile/photo", async (c) => {
  try {
    const accessToken = getAccessToken(c);
    const user = await getUserFromToken(accessToken);
    
    if (!user) {
      console.log(`Upload photo authorization error: No user found`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { photo, contentType } = await c.req.json();
    
    if (!photo || !contentType) {
      console.log(`Upload photo error: No photo or contentType provided`);
      return c.json({ error: "Photo and content type are required" }, 400);
    }

    console.log(`Uploading photo for user ${user.id}, content type: ${contentType}`);

    // Validate content type
    if (!contentType.startsWith('image/')) {
      console.log(`Upload photo error: Invalid content type ${contentType}`);
      return c.json({ error: "File must be an image" }, 400);
    }

    // Decode base64 to Uint8Array
    const binaryString = atob(photo);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Validate file size (5MB max)
    if (bytes.length > 5242880) {
      console.log(`Upload photo error: File too large ${bytes.length} bytes`);
      return c.json({ error: "File size must be less than 5MB" }, 400);
    }

    const bucketName = 'make-e44554cb-profile-photos';
    const fileName = `${user.id}_${Date.now()}.${contentType.split('/')[1]}`;
    
    console.log(`Uploading file ${fileName} to bucket ${bucketName}, size: ${bytes.length} bytes`);
    
    // Create Supabase client for storage operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, bytes, {
        contentType: contentType,
        upsert: true,
      });

    if (uploadError) {
      console.log(`Photo upload error: ${uploadError.message}`);
      return c.json({ error: uploadError.message }, 500);
    }

    console.log(`File uploaded successfully, creating signed URL`);

    // Create signed URL (valid for 1 year)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 31536000); // 1 year in seconds

    if (urlError) {
      console.log(`Signed URL error: ${urlError.message}`);
      return c.json({ error: urlError.message }, 500);
    }

    const photoUrl = signedUrlData.signedUrl;
    console.log(`Signed URL created: ${photoUrl}`);

    // Store the photo URL in KV store
    await kv.set(`profile_photo_${user.id}`, { photoUrl });

    return c.json({ success: true, photoUrl });
  } catch (error) {
    console.log(`Upload profile photo exception: ${error}`);
    console.log(`Error stack: ${error.stack}`);
    return c.json({ error: `Failed to upload photo: ${error.message}` }, 500);
  }
});

// Get profile photo endpoint (requires auth)
app.get("/make-server-e44554cb/profile/photo", async (c) => {
  try {
    const accessToken = getAccessToken(c);
    const user = await getUserFromToken(accessToken);
    
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const photoData = await kv.get(`profile_photo_${user.id}`);
    
    if (!photoData) {
      return c.json({ photoUrl: null });
    }

    return c.json({ photoUrl: photoData.photoUrl });
  } catch (error) {
    console.log(`Get profile photo error: ${error}`);
    return c.json({ error: "Failed to retrieve photo" }, 500);
  }
});

Deno.serve(app.fetch);