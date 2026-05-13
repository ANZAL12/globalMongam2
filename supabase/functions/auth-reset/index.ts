/// <reference lib="deno.ns" />

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const htmlHeaders = {
  ...corsHeaders,
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-cache, no-store, must-revalidate",
};

const HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password | Global Agencies</title>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #6366f1;
            --primary-hover: #4f46e5;
            --bg: #f8fafc;
            --card: #ffffff;
            --text: #0f172a;
            --text-muted: #64748b;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: 'Plus Jakarta Sans', sans-serif; 
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            color: var(--text);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 24px;
        }
        .card {
            background: var(--card);
            width: 100%;
            max-width: 440px;
            padding: 48px;
            border-radius: 32px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.5);
            text-align: center;
        }
        .icon-box {
            width: 64px;
            height: 64px;
            background: var(--primary);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 32px;
            box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.3);
            transform: rotate(3deg);
        }
        .icon-box svg { color: white; transform: rotate(-3deg); }
        h1 { font-size: 24px; font-weight: 800; letter-spacing: -0.025em; margin-bottom: 8px; }
        p { color: var(--text-muted); font-size: 15px; line-height: 1.6; margin-bottom: 32px; }
        
        .form-group { text-align: left; margin-bottom: 20px; }
        label { 
            display: block; 
            font-size: 12px; 
            font-weight: 700; 
            text-transform: uppercase; 
            letter-spacing: 0.05em; 
            color: var(--text-muted);
            margin-bottom: 8px;
            padding-left: 4px;
        }
        input {
            width: 100%;
            padding: 14px 18px;
            border-radius: 14px;
            border: 1px solid #e2e8f0;
            background: #f8fafc;
            font-size: 16px;
            font-weight: 600;
            outline: none;
            transition: all 0.2s;
        }
        input:focus {
            background: white;
            border-color: var(--primary);
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }
        button {
            width: 100%;
            padding: 16px;
            background: var(--primary);
            color: white;
            border: none;
            border-radius: 14px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            margin-top: 12px;
            box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.1);
        }
        button:hover { background: var(--primary-hover); transform: translateY(-1px); }
        button:active { transform: translateY(0); }
        button:disabled { opacity: 0.5; cursor: not-allowed; }

        .status { margin-top: 24px; padding: 16px; border-radius: 14px; font-size: 14px; font-weight: 600; display: none; }
        .status.error { background: #fef2f2; color: #991b1b; display: block; border: 1px solid #fee2e2; }
        .status.success { background: #f0fdf4; color: #166534; display: block; border: 1px solid #dcfce7; }

        .loader {
            display: none;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h1>New Password</h1>
        <p>Set a secure password for your account.</p>

        <form id="resetForm">
            <div class="form-group">
                <label>New Password</label>
                <input type="password" id="password" required placeholder="Password" minlength="6">
            </div>
            <div class="form-group">
                <label>Confirm Password</label>
                <input type="password" id="confirmPassword" required placeholder="Confirm password" minlength="6">
            </div>
            <button type="submit" id="submitBtn">
                <span id="btnText">Update Password</span>
                <div class="loader" id="loader"></div>
            </button>
        </form>

        <div id="status" class="status"></div>
    </div>

    <script>
        const supabaseUrl = 'YOUR_SUPABASE_URL';
        const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
        const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: true,
                detectSessionInUrl: true,
                autoRefreshToken: true
            }
        });

        const form = document.getElementById('resetForm');
        const status = document.getElementById('status');
        const submitBtn = document.getElementById('submitBtn');
        const btnText = document.getElementById('btnText');
        const loader = document.getElementById('loader');

        // Check for session on load to ensure the link is valid
        window.addEventListener('load', async () => {
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            if (error || !session) {
                showStatus('The recovery link is invalid or has expired. Please request a new one from the admin.', 'error');
                submitBtn.disabled = true;
            }
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password !== confirmPassword) {
                showStatus('Passwords do not match', 'error');
                return;
            }

            setLoading(true);
            try {
                const { error } = await supabaseClient.auth.updateUser({ password });
                if (error) throw error;
                
                showStatus('Password updated successfully! You can now log in to the app.', 'success');
                form.style.display = 'none';
            } catch (err) {
                showStatus(err.message || 'Failed to update password', 'error');
            } finally {
                setLoading(false);
            }
        });

        function showStatus(msg, type) {
            status.textContent = msg;
            status.className = 'status ' + type;
        }

        function setLoading(isLoading) {
            submitBtn.disabled = isLoading;
            btnText.style.display = isLoading ? 'none' : 'block';
            loader.style.display = isLoading ? 'block' : 'none';
        }
    </script>
</body>
</html>
`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Get Supabase config from environment variables
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables");
    return new Response("Configuration Error: Missing environment variables", { status: 500 });
  }

  // Inject config into HTML
  const finalHtml = HTML
    .replace('YOUR_SUPABASE_URL', supabaseUrl || '')
    .replace('YOUR_SUPABASE_ANON_KEY', supabaseAnonKey || '');

  return new Response(new Blob([finalHtml], { type: "text/html; charset=utf-8" }), {
    headers: htmlHeaders,
  });
});
