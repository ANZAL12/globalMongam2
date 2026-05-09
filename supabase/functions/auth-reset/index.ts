import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password | Global Agencies</title>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #4f46e5;
            --primary-hover: #4338ca;
            --bg: #f9fafb;
            --card: #ffffff;
            --text: #111827;
            --text-light: #6b7280;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: 'Inter', sans-serif; 
            background-color: var(--bg); 
            color: var(--text);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            background: var(--card);
            width: 100%;
            max-width: 450px;
            padding: 48px;
            border-radius: 40px;
            box-shadow: 0 20px 50px rgba(79, 70, 229, 0.08);
            border: 1px solid rgba(0,0,0,0.02);
            text-align: center;
        }
        .logo-box {
            width: 64px;
            height: 64px;
            background: var(--primary);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 32px;
            box-shadow: 0 10px 20px rgba(79, 70, 229, 0.2);
            transform: rotate(3deg);
        }
        .logo-box svg { color: white; transform: rotate(-3deg); }
        h1 { font-size: 28px; font-weight: 900; letter-spacing: -0.02em; margin-bottom: 8px; }
        p { color: var(--text-light); font-size: 14px; font-weight: 500; margin-bottom: 32px; }
        
        .form-group { text-align: left; margin-bottom: 24px; }
        label { 
            display: block; 
            font-size: 10px; 
            font-weight: 900; 
            text-transform: uppercase; 
            letter-spacing: 0.1em; 
            color: #9ca3af;
            margin-bottom: 8px;
            padding-left: 4px;
        }
        input {
            width: 100%;
            padding: 16px 20px;
            border-radius: 16px;
            border: 1px solid #f3f4f6;
            background: #f9fafb;
            font-size: 16px;
            font-weight: 700;
            outline: none;
            transition: all 0.2s;
        }
        input:focus {
            background: white;
            border-color: var(--primary);
            box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
        }
        button {
            width: 100%;
            padding: 18px;
            background: var(--primary);
            color: white;
            border: none;
            border-radius: 18px;
            font-size: 14px;
            font-weight: 900;
            cursor: pointer;
            transition: all 0.2s;
            margin-top: 12px;
            box-shadow: 0 10px 20px rgba(79, 70, 229, 0.15);
        }
        button:hover { background: var(--primary-hover); transform: translateY(-1px); }
        button:active { transform: translateY(0); }
        button:disabled { opacity: 0.5; cursor: not-allowed; }

        .status { margin-top: 24px; padding: 16px; border-radius: 16px; font-size: 14px; font-weight: 600; display: none; }
        .status.error { background: #fef2f2; color: #b91c1c; display: block; }
        .status.success { background: #ecfdf5; color: #059669; display: block; }

        .loader {
            display: none;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
            margin: 0 auto;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div className="container">
        <div className="logo-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h1>New Password</h1>
        <p>Set a secure password for your account.</p>

        <form id="resetForm">
            <div className="form-group">
                <label>New Password</label>
                <input type="password" id="password" required placeholder="••••••••" minlength="6">
            </div>
            <div className="form-group">
                <label>Confirm Password</label>
                <input type="password" id="confirmPassword" required placeholder="••••••••" minlength="6">
            </div>
            <button type="submit" id="submitBtn">
                <span id="btnText">Update Password</span>
                <div className="loader" id="loader"></div>
            </button>
        </form>

        <div id="status" className="status"></div>
    </div>

    <script>
        // Use environment variables injected by Supabase or hardcode for simplicity since it's a public client
        const supabaseUrl = 'YOUR_SUPABASE_URL';
        const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
        const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

        const form = document.getElementById('resetForm');
        const status = document.getElementById('status');
        const submitBtn = document.getElementById('submitBtn');
        const btnText = document.getElementById('btnText');
        const loader = document.getElementById('loader');

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
                setTimeout(() => {
                    // Try to redirect back to app or just stay
                }, 3000);
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Get Supabase config from environment variables
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

  // Inject config into HTML
  const finalHtml = HTML
    .replace('YOUR_SUPABASE_URL', supabaseUrl)
    .replace('YOUR_SUPABASE_ANON_KEY', supabaseAnonKey);

  return new Response(finalHtml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
    },
  });
});
