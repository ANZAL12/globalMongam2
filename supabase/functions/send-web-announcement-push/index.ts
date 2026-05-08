import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { cert, getApps, initializeApp } from "npm:firebase-admin/app";
import { getMessaging } from "npm:firebase-admin/messaging";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type RequestBody = {
  announcementId?: string;
  targetIds?: string[];
};

function getFirebaseApp() {
  if (getApps().length > 0) return getApps()[0];

  const rawServiceAccount = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (!rawServiceAccount) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON secret.");
  }

  return initializeApp({
    credential: cert(JSON.parse(rawServiceAccount)),
  });
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase Edge Function environment.");
    }

    const authHeader = req.headers.get("Authorization") || "";
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: caller, error: callerError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    if (callerError || caller?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { announcementId, targetIds }: RequestBody = await req.json();
    if (!announcementId || !Array.isArray(targetIds) || targetIds.length === 0) {
      return new Response(JSON.stringify({ error: "announcementId and targetIds are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: announcement, error: announcementError } = await supabaseAdmin
      .from("announcements")
      .select("title, description")
      .eq("id", announcementId)
      .single();

    if (announcementError || !announcement) {
      throw announcementError || new Error("Announcement not found");
    }

    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id, role, fcm_web_push_token, expo_push_token")
      .in("id", targetIds);

    if (usersError) throw usersError;

    // --- 1. Web Push (Firebase Cloud Messaging) ---
    const webRecipients = (users || []).filter((user) => user.fcm_web_push_token);
    
    let webSuccessCount = 0;
    let webFailureCount = 0;

    if (webRecipients.length > 0) {
      const app = getFirebaseApp();
      const messaging = getMessaging(app);

      for (const group of chunk(webRecipients, 500)) {
        const messages = group.map((user) => {
          const url = user.role === "approver"
            ? `/approver/details/${announcementId}`
            : `/promoter/details/${announcementId}`;

          return {
            token: user.fcm_web_push_token as string,
            notification: {
              title: announcement.title || "New announcement",
              body: (announcement.description || "You have a new announcement.").slice(0, 120),
            },
            webpush: {
              fcmOptions: {
                link: url,
              },
            },
            data: {
              type: "announcement",
              announcement_id: announcementId,
              url,
            },
          };
        });

        const response = await messaging.sendEach(messages);

        webSuccessCount += response.successCount;
        webFailureCount += response.failureCount;
      }
    }

    // --- 2. Mobile Push (Expo Push Notifications) ---
    const expoRecipients = (users || []).filter((user) => user.expo_push_token && (user.expo_push_token.startsWith('ExponentPushToken') || user.expo_push_token.startsWith('ExpoPushToken')));
    let expoSuccessCount = 0;

    if (expoRecipients.length > 0) {
      const expoMessages = expoRecipients.map((user) => ({
        to: user.expo_push_token,
        title: announcement.title || "New announcement",
        body: (announcement.description || "You have a new announcement.").slice(0, 120),
        sound: "default",
        priority: "high",
        channelId: "default",
        data: {
          type: "announcement",
          announcement_id: announcementId
        }
      }));

      // Expo supports up to 100 messages per request
      for (const group of chunk(expoMessages, 100)) {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(group),
        });
        
        if (response.ok) {
           const resData = await response.json();
           expoSuccessCount += resData.data ? resData.data.length : 0;
        } else {
           console.error('Expo Push Error:', await response.text());
        }
      }
    }

    return new Response(JSON.stringify({ 
      web_sent: webSuccessCount, 
      web_failed: webFailureCount,
      expo_sent: expoSuccessCount 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
