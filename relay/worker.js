function matches(filter, ev) {
  if (filter.ids && !filter.ids.includes(ev.id)) return false;
  if (filter.authors && !filter.authors.includes(ev.pubkey)) return false;
  if (filter.kinds && !filter.kinds.includes(ev.kind)) return false;
  if (filter.since && ev.created_at < filter.since) return false;
  if (filter.until && ev.created_at > filter.until) return false;
  for (const key of Object.keys(filter)) {
    if (key.startsWith("#")) {
      const tag = key.slice(1);
      const values = (ev.tags || []).filter((t) => t[0] === tag).map((t) => t[1]);
      if (!filter[key].some((v) => values.includes(v))) return false;
    }
  }
  return true;
}

export class RelayRoom {
  constructor(state) {
    this.state = state;
  }

  async fetch(req) {
    if (req.headers.get("Upgrade") !== "websocket") {
      return new Response(JSON.stringify({ name: "stream-for-all relay", supported_nips: [1] }), {
        headers: { "Content-Type": "application/nostr+json", "Access-Control-Allow-Origin": "*" }
      });
    }
    if (this.state.getWebSockets().length >= 64) {
      return new Response("relay full", { status: 503 });
    }
    const pair = new WebSocketPair();
    this.state.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment({ subs: {}, winStart: 0, winCount: 0 });
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  webSocketMessage(ws, raw) {
    if (typeof raw !== "string" || raw.length > 16384) return;
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const att = ws.deserializeAttachment() || { subs: {}, winStart: 0, winCount: 0 };

    const now = Date.now();
    if (now - att.winStart > 10_000) { att.winStart = now; att.winCount = 0; }
    att.winCount++;
    ws.serializeAttachment(att);
    if (att.winCount > 60) {
      if (att.winCount > 200) { try { ws.close(1008, "rate limit"); } catch {} }
      return;
    }

    if (msg[0] === "EVENT") {
      const ev = msg[1];
      if (!ev || typeof ev.id !== "string") return;
      try { ws.send(JSON.stringify(["OK", ev.id, true, ""])); } catch {}
      for (const client of this.state.getWebSockets()) {
        const a = client.deserializeAttachment() || { subs: {} };
        for (const [sid, filters] of Object.entries(a.subs)) {
          if (filters.some((f) => matches(f, ev))) {
            try { client.send(JSON.stringify(["EVENT", sid, ev])); } catch {}
          }
        }
      }
    } else if (msg[0] === "REQ") {
      const [, sid, ...filters] = msg;
      if (typeof sid !== "string" || Object.keys(att.subs).length > 20) return;
      att.subs[sid] = filters;
      ws.serializeAttachment(att);
      try { ws.send(JSON.stringify(["EOSE", sid])); } catch {}
    } else if (msg[0] === "CLOSE") {
      delete att.subs[msg[1]];
      ws.serializeAttachment(att);
    }
  }

  webSocketClose(ws) {
    try { ws.close(); } catch {}
  }
}

export default {
  fetch(req, env) {
    const id = env.RELAY.idFromName("global");
    return env.RELAY.get(id).fetch(req);
  }
};
