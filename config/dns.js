/**
 * Some Windows/VPN setups refuse the SRV lookups that `mongodb+srv://` URIs
 * need (Node fails with `querySrv ECONNREFUSED` even though the OS resolver
 * works). This probes the SRV record and, only if it fails, points Node at
 * public DNS resolvers for the rest of the process.
 */

const dns = require("dns");

async function ensureSrvResolution(uri) {
  if (!uri || !uri.startsWith("mongodb+srv://")) return;

  const host = uri.split("@")[1]?.split(/[/?]/)[0];
  if (!host) return;

  const record = `_mongodb._tcp.${host}`;

  try {
    await dns.promises.resolveSrv(record);
    return; // system resolver is fine
  } catch (err) {
    const fallback = ["8.8.8.8", "1.1.1.1"];
    try {
      dns.setServers([...fallback, ...dns.getServers()]);
      await dns.promises.resolveSrv(record);
      console.log(
        `ℹ️  System DNS could not resolve ${record} (${err.code}) — using public DNS instead.`,
      );
    } catch (err2) {
      console.error(
        `⚠️  SRV lookup for ${record} failed on both system and public DNS: ${err2.message}`,
      );
    }
  }
}

module.exports = { ensureSrvResolution };
