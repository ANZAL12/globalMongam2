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
  saleId: string;
  approverId: string;
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

    const { saleId, approverId }: RequestBody = await req.json();
    if (!saleId || !approverId) {
      return new Response(JSON.stringify({ error: "saleId and approverId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch sale details
    const { data: sale, error: saleError } = await supabaseAdmin
      .from("sales")
      .select(`
        *,
        promoter:users!sales_promoter_id_fkey (
          email,
          full_name
        )
      `)
      .eq("id", saleId)
      .single();

    if (saleError || !sale) {
      throw saleError || new Error("Sale not found");
    }

    // 2. Fetch approver details
    const { data: approver, error: approverError } = await supabaseAdmin
      .from("users")
      .select("id, fcm_web_push_token, expo_push_token")
      .eq("id", approverId)
      .single();

    if (approverError || !approver) {
      throw approverError || new Error("Approver not found");
    }

    const title = "New Sale for Approval";
    const body = `${sale.product_name} submitted by ${sale.promoter?.full_name || sale.promoter?.email} needs your review.`;
    const url = `/approver/sale/${saleId}`;

    let webSuccess = false;
    let expoSuccess = false;

    // --- Send via Firebase (Web/Native FCM) ---
    if (approver.fcm_web_push_token) {
      const app = getFirebaseApp();
      const messaging = getMessaging(app);
      
      try {
        await messaging.send({
          token: approver.fcm_web_push_token,
          notification: { title, body },
          webpush: { fcmOptions: { link: url } },
          data: {
            type: "sale_pending_approval",
            sale_id: saleId,
            url
          }
        });
        webSuccess = true;
      } catch (e) {
        console.error("FCM Send Error:", e);
      }
    }

    // --- Send via Expo (Mobile Push) ---
    if (approver.expo_push_token && (approver.expo_push_token.startsWith('ExponentPushToken') || approver.expo_push_token.startsWith('ExpoPushToken'))) {
      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: approver.expo_push_token,
            title,
            body,
            sound: "default",
            data: {
              type: "sale_pending_approval",
              sale_id: saleId
            }
          }),
        });
        if (response.ok) expoSuccess = true;
      } catch (e) {
        console.error("Expo Send Error:", e);
      }
    }

    return new Response(JSON.stringify({ 
      success: webSuccess || expoSuccess,
      web_sent: webSuccess,
      expo_sent: expoSuccess
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
