export const LINKS = {
  landing: "https://leocoout.github.io/stream-for-all"
};

export const CUSTOM_RELAY = "wss://sfa-relay.leo-d3a.workers.dev";

export const TURN_SERVERS = [
  {
    urls: [
      "turn:staticauth.openrelay.metered.ca:80",
      "turn:staticauth.openrelay.metered.ca:443",
      "turns:staticauth.openrelay.metered.ca:443?transport=tcp"
    ],
    username: "openrelayproject",
    credential: "openrelayproject"
  }
];
