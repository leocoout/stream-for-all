const enc = new TextEncoder();
const dec = new TextDecoder();
const SIGN_ALGO = { name: "ECDSA", namedCurve: "P-256" };
const SIGN_OP = { name: "ECDSA", hash: "SHA-256" };

export function b64u(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function ub64u(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

export function randId(bytes = 12) {
  return b64u(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function loadIdentity() {
  const stored = (await chrome.storage.local.get("sfa-identity"))["sfa-identity"];
  if (stored) {
    const priv = await crypto.subtle.importKey("jwk", stored.priv, SIGN_ALGO, false, ["sign"]);
    return { priv, pubId: stored.pubId, name: stored.name || "" };
  }
  const kp = await crypto.subtle.generateKey(SIGN_ALGO, true, ["sign", "verify"]);
  const privJwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
  const rawPub = await crypto.subtle.exportKey("raw", kp.publicKey);
  const pubId = b64u(rawPub);
  await chrome.storage.local.set({ "sfa-identity": { priv: privJwk, pubId } });
  const priv = await crypto.subtle.importKey("jwk", privJwk, SIGN_ALGO, false, ["sign"]);
  return { priv, pubId, name: "" };
}

export async function saveName(name) {
  const stored = (await chrome.storage.local.get("sfa-identity"))["sfa-identity"];
  if (stored) {
    stored.name = name;
    await chrome.storage.local.set({ "sfa-identity": stored });
  }
}

export async function signStr(priv, str) {
  return b64u(await crypto.subtle.sign(SIGN_OP, priv, enc.encode(str)));
}

export async function verifyStr(pubId, str, sigB64) {
  try {
    const key = await crypto.subtle.importKey("raw", ub64u(pubId), SIGN_ALGO, false, ["verify"]);
    return await crypto.subtle.verify(SIGN_OP, key, ub64u(sigB64), enc.encode(str));
  } catch {
    return false;
  }
}

function entryStr(e) {
  return [e.type, e.pub, (e.name || "").replace(/\|/g, ""), e.ts, e.by, e.groupId].join("|");
}

export async function makeEntry(id, groupId, type, pub, name) {
  const e = { type, pub, name: (name || "").replace(/\|/g, ""), ts: Date.now(), by: id.pubId, groupId };
  e.sig = await signStr(id.priv, entryStr(e));
  return e;
}

export function mergeEntries(a, b) {
  const seen = new Set(a.map((e) => e.sig));
  return a.concat(b.filter((e) => e && e.sig && !seen.has(e.sig)));
}

export async function computeMembers(group) {
  const adds = [];
  const removes = [];
  for (const e of group.entries || []) {
    if (!(await verifyStr(e.by, entryStr(e), e.sig))) continue;
    if (e.type === "add") adds.push(e);
    else if (e.type === "remove" && e.by === group.founderPub) removes.push(e);
  }
  const trusted = new Map([[group.founderPub, "host"]]);
  for (const e of adds) {
    if (e.by !== group.founderPub) continue;
    if (e.pub === group.founderPub) {
      if (e.name) trusted.set(group.founderPub, e.name);
    } else {
      trusted.set(e.pub, e.name || "friend");
    }
  }
  for (const e of removes) {
    if (e.pub !== group.founderPub) trusted.delete(e.pub);
  }
  return trusted;
}

export function makeInviteCode(group, inviterName) {
  const payload = { g: group.groupId, s: group.groupSecret, f: group.founderPub, n: inviterName || "" };
  return b64u(enc.encode(JSON.stringify(payload)));
}

export function parseInviteCode(code) {
  const clean = code.trim().replace(/^.*[?&]join=/, "").replace(/[#&].*$/, "");
  return JSON.parse(dec.decode(ub64u(clean)));
}

export async function deriveRoomTopic(appId, groupId) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(appId + ":" + groupId));
  return b64u(digest).slice(0, 40);
}
