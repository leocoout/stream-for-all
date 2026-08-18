import { webcrypto } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
if (!globalThis.crypto) globalThis.crypto = webcrypto;

const cryptoPath = join(dirname(fileURLToPath(import.meta.url)), "..", "crypto.js");
const { signStr, verifyStr, makeEntry, mergeEntries, verifyEntry, computeMembers, makeInviteCode, parseInviteCode } =
  await import(cryptoPath);

const SIGN_ALGO = { name: "ECDSA", namedCurve: "P-256" };
const b64u = (buf) => Buffer.from(new Uint8Array(buf)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const canon = (e) => [e.type, e.pub, e.name || "", e.ts, e.by, e.groupId].join("|");

async function newIdentity() {
  const kp = await crypto.subtle.generateKey(SIGN_ALGO, true, ["sign", "verify"]);
  const raw = await crypto.subtle.exportKey("raw", kp.publicKey);
  return { priv: kp.privateKey, pubId: b64u(raw) };
}

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log("  ✅ PASS:", name); }
  else { fail++; console.log("  ❌ FAIL:", name); }
}

const host = await newIdentity();
const alice = await newIdentity();
const mallory = await newIdentity();

const groupId = "g_test";
const hostSelfAdd = await makeEntry(host, groupId, "add", host.pubId, "Host");
const addAlice = await makeEntry(host, groupId, "add", alice.pubId, "Alice");
const group = { groupId, groupSecret: "s_secret", founderPub: host.pubId, entries: [hostSelfAdd, addAlice] };

console.log("\n== 1. Baseline: legit roster ==");
const m = await computeMembers(group);
check("host is a member", m.has(host.pubId));
check("alice is a member", m.has(alice.pubId));
check("mallory is NOT a member", !m.has(mallory.pubId));

console.log("\n== 2. Attacker forges self-add signed with own key ==");
const forgeSelf = await makeEntry(mallory, groupId, "add", mallory.pubId, "Mallory");
check("verifyEntry rejects non-host-signed add", !(await verifyEntry(forgeSelf, group.founderPub)));
check("computeMembers still excludes mallory", !(await computeMembers({ ...group, entries: [...group.entries, forgeSelf] })).has(mallory.pubId));

console.log("\n== 3. Attacker claims by=host but signs with own key ==");
const spoof = { type: "add", pub: mallory.pubId, name: "M", ts: Date.now(), by: host.pubId, groupId };
spoof.sig = await signStr(mallory.priv, canon(spoof));
check("verifyEntry rejects host-claimed add signed by attacker", !(await verifyEntry(spoof, group.founderPub)));
check("computeMembers excludes attacker (signature check)", !(await computeMembers({ ...group, entries: [...group.entries, spoof] })).has(mallory.pubId));

console.log("\n== 4. Attacker tampers a REAL host entry (retarget to self) ==");
const tampered = { ...addAlice, pub: mallory.pubId };
check("verifyEntry rejects tampered entry", !(await verifyEntry(tampered, group.founderPub)));
check("tampered entry does not add mallory", !(await computeMembers({ ...group, entries: [...group.entries, tampered] })).has(mallory.pubId));

console.log("\n== 5. Non-host member (Alice) tries to admit attacker ==");
const aliceAddsMallory = await makeEntry(alice, groupId, "add", mallory.pubId, "M");
check("Alice's add is validly signed by herself", await verifyStr(aliceAddsMallory.by, canon(aliceAddsMallory), aliceAddsMallory.sig));
check("but verifyEntry rejects it (host-only)", !(await verifyEntry(aliceAddsMallory, group.founderPub)));
check("host-only admission holds: mallory excluded", !(await computeMembers({ ...group, entries: [...group.entries, aliceAddsMallory] })).has(mallory.pubId));

console.log("\n== 6. Attacker tries to REMOVE a member ==");
const evilRemove = await makeEntry(mallory, groupId, "remove", alice.pubId, "");
check("attacker cannot remove Alice", (await computeMembers({ ...group, entries: [...group.entries, evilRemove] })).has(alice.pubId));

console.log("\n== 7. Identity impersonation via handshake (proof) ==");
const nonce = "nonce_abc";
const forgedProof = await signStr(mallory.priv, `${alice.pubId}:${nonce}`);
check("proof signed by attacker fails verification as Alice", !(await verifyStr(alice.pubId, `${alice.pubId}:${nonce}`, forgedProof)));
const realProof = await signStr(alice.priv, `${alice.pubId}:${nonce}`);
check("Alice's real proof verifies", await verifyStr(alice.pubId, `${alice.pubId}:${nonce}`, realProof));
check("replay of Alice's proof under a DIFFERENT nonce fails", !(await verifyStr(alice.pubId, `${alice.pubId}:other`, realProof)));

console.log("\n== 8. Roster spam / DoS (rost handler filters before storage) ==");
let kept = 0;
for (let i = 0; i < 2000; i++) {
  const e = { type: "add", pub: "x" + i, name: "n", ts: i, by: host.pubId, groupId, sig: b64u(crypto.getRandomValues(new Uint8Array(64))) };
  if (await verifyEntry(e, group.founderPub)) kept++;
}
check("all 2000 forged spam entries are rejected before storage", kept === 0);

console.log("\n== 9. Invite code integrity ==");
let threw = false;
try { parseInviteCode("!!!not-valid!!!"); } catch { threw = true; }
check("malformed invite code throws (handled by caller)", threw);
const inv = parseInviteCode(makeInviteCode(group, "Host"));
check("valid invite code round-trips groupId", inv.g === group.groupId);
check("invite code carries no private key", !JSON.stringify(inv).includes("priv"));

console.log("\n== 10. Dedup: replaying valid entries cannot grow the log ==");
check("duplicate valid entries are deduped by signature", mergeEntries(group.entries, [addAlice, addAlice, hostSelfAdd]).length === group.entries.length);

console.log(`\n===== RESULT: ${pass} passed, ${fail} failed =====`);
process.exit(fail ? 1 : 0);
