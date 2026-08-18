const enc = new TextEncoder();

function b64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str) {
  return atob(str.replace(/-/g, "+").replace(/_/g, "/"));
}

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", key, enc.encode(data));
}

async function hmacHex(secret, data) {
  return [...new Uint8Array(await hmac(secret, data))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function signSession(env, payload) {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = b64url(await hmac(env.SIGNING_SECRET, body));
  return body + "." + sig;
}

async function verifySession(env, token) {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = b64url(await hmac(env.SIGNING_SECRET, body));
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(b64urlDecode(body));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { ...cors, "content-type": "application/json" } });

    if (url.pathname === "/login") {
      const auth = new URL("https://discord.com/oauth2/authorize");
      auth.searchParams.set("client_id", env.DISCORD_CLIENT_ID);
      auth.searchParams.set("redirect_uri", url.origin + "/callback");
      auth.searchParams.set("response_type", "code");
      auth.searchParams.set("scope", "identify");
      return Response.redirect(auth.toString(), 302);
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) return new Response("Missing code", { status: 400 });
      const tokenRes = await fetch("https://discord.com/api/v10/oauth2/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: env.DISCORD_CLIENT_ID,
          client_secret: env.DISCORD_CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri: url.origin + "/callback"
        })
      });
      if (!tokenRes.ok) return new Response("OAuth exchange failed", { status: 400 });
      const { access_token } = await tokenRes.json();
      const meRes = await fetch("https://discord.com/api/v10/users/@me", {
        headers: { authorization: "Bearer " + access_token }
      });
      if (!meRes.ok) return new Response("Failed to fetch user", { status: 400 });
      const me = await meRes.json();
      const name = me.global_name || me.username;
      const session = await signSession(env, { uid: me.id, name, exp: Date.now() + 7 * 86400 * 1000 });
      const html = `<!doctype html><body style="font-family:sans-serif;background:#1e1f22;color:#fff;padding:40px">
Logged in as ${name.replace(/[<>&]/g, "")} — you can close this window.
<script>
window.opener && window.opener.postMessage({ sfa: true, session: ${JSON.stringify(session)}, name: ${JSON.stringify(name)} }, "*");
setTimeout(() => window.close(), 800);
</script></body>`;
      return new Response(html, { headers: { "content-type": "text/html" } });
    }

    if (url.pathname === "/invite") {
      const invite = new URL("https://discord.com/oauth2/authorize");
      invite.searchParams.set("client_id", env.DISCORD_CLIENT_ID);
      invite.searchParams.set("scope", "bot");
      invite.searchParams.set("permissions", "1024");
      const guild = url.searchParams.get("guild_id");
      if (guild) {
        invite.searchParams.set("guild_id", guild);
        invite.searchParams.set("disable_guild_select", "true");
      }
      return Response.redirect(invite.toString(), 302);
    }

    if (url.pathname === "/verify" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const payload = await verifySession(env, body.session);
      if (!payload) return json({ error: "bad_session" }, 401);
      if (!/^\d{5,25}$/.test(String(body.guildId || ""))) return json({ error: "bad_request" }, 400);

      const res = await fetch(`https://discord.com/api/v10/guilds/${body.guildId}/voice-states/${payload.uid}`, {
        headers: { authorization: "Bot " + env.DISCORD_BOT_TOKEN }
      });
      if (res.status === 401 || res.status === 403) return json({ error: "bot_missing" }, 403);
      if (res.status === 404) {
        const err = await res.json().catch(() => ({}));
        if (err.code === 10004) return json({ error: "bot_missing" }, 403);
        return json({ error: "not_in_voice" }, 403);
      }
      if (!res.ok) return json({ error: "discord_error" }, 502);
      const state = await res.json();
      if (!state.channel_id) return json({ error: "not_in_voice" }, 403);

      const day = new Date().toISOString().slice(0, 10);
      const roomKey = await hmacHex(env.SIGNING_SECRET, `room:${body.guildId}:${state.channel_id}:${day}`);
      return json({ channelId: state.channel_id, roomKey, name: payload.name });
    }

    return new Response("Stream for All verifier", { headers: cors });
  }
};
