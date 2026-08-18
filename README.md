# Stream for All

Stream for All is a Chrome extension. It creates private screen sharing rooms for a small group. Members connect directly to each other with WebRTC. No server stores the video.

You organize the group in any chat, such as Discord. You share an invite link there. The extension does the rest.

## Features

- Screen sharing at up to 1080p and 60 fps.
- Opt-in watching. You choose which live stream to open.
- Host approval. The host admits each new member.
- Picture-in-picture. You open any stream in a separate window.
- Viewer list. You see who watches each stream.
- Notification sounds for join, leave, and stream events.
- Brazilian Portuguese interface.

## Install

1. Download this folder. Unzip it to a permanent location.
2. Open `chrome://extensions`.
3. Turn on Developer mode.
4. Click Load unpacked. Select the folder.

Each friend installs the extension the same way.

## Use

Click the extension icon in the toolbar. Click Start streaming. A small window opens.

Enter a nickname. Then choose one option:

- Host a room. The extension creates a room. It shows an invite link. Copy the link and send it to your friends.
- Enter with code. Paste the invite code that a friend sent you.

To share your screen, click Share screen. Pick a screen or window. Other members see your name in the Live now list. They click Watch to open your stream.

The host admits each new member. Open the requests from the header button. Click Approve.

## Invite links

The host copies an invite link. The link points to a landing page.

- If your friend has the extension, the link opens the room.
- If your friend does not have the extension, the link opens the install page.

The invite code also works on its own. A friend pastes it in the Enter with code screen.

You host the landing page yourself. The default page is at `https://leocoout.github.io/stream-for-all`. Set the address in `config.js`.

## Security

- Identity. Each install generates an ECDSA P-256 key pair. The extension stores it in the browser. Your public key is your member ID.
- Membership. A group is a signed list of member keys. The list roots at the host key. The host signs each add and each remove. The list syncs between peers.
- Admission. Peers prove key ownership before any video flows. Each peer signs a fresh random challenge. The extension sends a stream only to a verified member. It renders a stream only from a verified member.
- Revocation. The host removes a member with one click. The signed removal syncs. Peers stop sending video to that key.
- No backend. Signaling runs over public Nostr relays through the bundled Trystero library. Video runs peer to peer. There is no bot, no login server, and no database.

The code is open source and holds no secrets. The security rests on each person's private key.

Invite links and codes are semi-private. They carry the room password. A person with the link reaches the signaling lobby. That person cannot see a stream without host approval.

Run the security tests with `make test`. The tests try to forge membership, impersonate members, tamper entries, and spam the roster.

## Project structure

- `manifest.json`: the extension manifest (Manifest V3).
- `popup.html`, `popup.js`: the toolbar popup with the Start button.
- `background.js`: the service worker that opens a room from an invite link.
- `room.html`, `room.js`: onboarding, membership, and the WebRTC mesh.
- `onboarding.js`: the nickname, host, and join steps.
- `crypto.js`: identity, the signed roster, and invite codes.
- `groups.js`: group storage.
- `streamQuality.js`: resolution, frame rate, and bitrate.
- `videoGrid.js`: the video tile lifecycle.
- `mock.js`: data and helpers for the mock preview.
- `sounds.js`: notification sounds.
- `strings.js`: the user-facing text in Brazilian Portuguese.
- `config.js`: the landing page address.
- `tokens.css`: the design tokens.
- `components/`: the visual components. One component per file (rule R001).
- `trystero-nostr.min.js`: the bundled Trystero library.

## Build and test

- `make zip` builds the extension zip in `release/`.
- `make test` runs the security tests.
- `make local` serves the pages for a local preview. Open `room.html?mock=1` to preview the room with mock data.

## License

Stream for All uses the MIT license. See `LICENSE`.
