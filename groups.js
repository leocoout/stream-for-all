import { randId, makeEntry } from "./crypto.js";

export async function loadGroups() {
  return (await chrome.storage.local.get("sfa-groups"))["sfa-groups"] || {};
}

export async function saveGroup(g) {
  const groups = await loadGroups();
  groups[g.groupId] = g;
  await chrome.storage.local.set({ "sfa-groups": groups });
}

export async function deleteGroup(groupId) {
  const groups = await loadGroups();
  delete groups[groupId];
  await chrome.storage.local.set({ "sfa-groups": groups });
}

export async function createHostGroup(id, name, ctx) {
  const groupId = randId();
  const g = {
    groupId,
    groupSecret: randId(32),
    founderPub: id.pubId,
    name: `${name}'s room`,
    ctx: ctx || null,
    entries: []
  };
  g.entries = [await makeEntry(id, groupId, "add", id.pubId, name)];
  await saveGroup(g);
  return g;
}

export async function joinFromInvite(inv, ctx) {
  const groups = await loadGroups();
  const g = groups[inv.g] || {
    groupId: inv.g,
    groupSecret: inv.s,
    founderPub: inv.f,
    name: inv.n ? inv.n + "'s room" : "Room",
    ctx: ctx || null,
    entries: []
  };
  await saveGroup(g);
  return g;
}
