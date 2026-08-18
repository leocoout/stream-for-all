# Stream for All

Your own screen sharing system, launched from Discord. A floating button on discord.com opens a room where your friend group connects peer-to-peer over WebRTC — anyone shares their screen at 1080p60 / 10 Mbps and everyone sees all streams in a grid.

No server, no bot, no passwords, no platform account that anyone can ban. Membership is enforced by cryptography: each install holds a private key, a group is a signed list of member keys, and peers prove key ownership before any video flows. Discord is used only as the place you paste invite links — nothing in the system depends on it.

## Install (you and your friends)

1. Get this folder (zip with `make zip`, or send the folder); unzip somewhere permanent
2. `chrome://extensions` → **Developer mode** → **Load unpacked** → select the folder
3. Open https://discord.com/app

## Use

**Create a group (once):**
1. Click the floating **🖥️ Stream for All** button — the room page opens
2. Enter your name, name the group, click **Create group**
3. Click **📋 Copy invite link** and paste it into your Discord channel

**Friends join:**
1. They install the extension, click the invite link (or paste it in the room page)
2. They appear under **Wants to join** on any online member's screen — click **Approve**
3. Once approved they're a member; **🖥️ Share my screen** works for everyone

Each Discord server maps to its own group automatically after the first time — clicking the button from that server reopens the same group.

## Security model

- **Identity**: every install generates an ECDSA P-256 keypair, stored locally in the browser. The public key is your member ID.
- **Membership**: a group is an append-only, signed roster rooting at the founder's key. Adding a member = an existing member signs a new entry; removing = the founder signs a revocation. Rosters gossip between peers automatically.
- **Admission**: before streams are exchanged, peers run a signed challenge-response (a fresh random nonce each time) proving they hold a private key that's on the roster. Streams are only sent to, and only rendered from, verified members.
- **Why this is safe to open-source**: there are no secrets in the code. Security rests entirely on each person's local private key. Invite links carry only public data, so a leaked/screenshotted invite can't be used without a member clicking Approve.
- **Revocation**: the founder clicks **Remove**; the signed revocation gossips and honest peers immediately stop streaming to that key. No manual key rotation, no re-inviting everyone.
- **Nothing to ban**: signaling rides public Nostr relays (via the bundled Trystero) and video is peer-to-peer. No Discord bot, no OAuth app, no backend of ours.

Known limits (fine at friends scale): any member can approve a newcomer (not founder-only); a leaked invite link + a careless Approve click lets someone in until removed; tile names are self-asserted but the underlying key identity is not.

## Files

- `ui.js` — the launcher button on discord.com (passes the current server as context)
- `room.html` / `room.js` — group management, the crypto handshake, and the WebRTC mesh
- `crypto.js` — identity, signed roster, invite encoding
- `trystero-nostr.min.js` — bundled Trystero (serverless WebRTC signaling over Nostr relays)
- `verifier/` — **optional, not wired in.** A Cloudflare Worker for groups that additionally want provable "currently in this voice channel" enforcement via their own Discord bot. Ignore it unless you want that stricter check later.

## Release

```bash
make zip     # builds stream-for-all-<version>.zip with just the extension files
```

## Tweaks

- Quality: `MAX_BITRATE` and the `getDisplayMedia` constraints in `room.js`
- If two friends behind strict NATs can't connect, add a TURN server via Trystero's `rtcConfig` in `joinRoom`
