# Isolation Troubleshooting Checklist

If a user is in the `DROP` profile but still has internet access, check the following:

## 1. Firewall Filter Order (CRITICAL)
MikroTik processes firewall rules from top to bottom. If you have a generic "Accept All Forward" or "Accept Established/Related" rule **ABOVE** the isolation rules, the traffic will be allowed before it hits the Drop rule.

**Action:**
- Check `/ip firewall filter print`
- Ensure the rule `Buroq Autoisolir - Drop All Other Traffic Isolir` is **ABOVE** any general allow rules for the user's subnet.
- The script adds rules to the bottom by default (except the DNS one).

## 2. NAT Rule Order
Similarly, the DST-NAT rule redirecting Port 80 to Port 1500 must be active and above conflicting NAT rules.

**Action:**
- Check `/ip firewall nat print`

## 3. FastTrack Connection
FastTrack can bypass filter rules.
**Action:**
- Ensure you have a standard "Drop Invalid" or proper FastTrack configuration.
- Try temporarily disabling FastTrack rule to test: `/ip firewall filter disable [find action=fasttrack-connection]`

## 4. Active Connection State
If the user already had an active connection (e.g. watching YouTube) when isolation started, that specific connection might remain "Established" and bypass new rules if you have "Accept Established" at the top.
**Action:**
- The system tries to remove active PPP connections, but sometimes the device reconnects instantly.
- Clear connection tracking entries for that IP: `/ip firewall connection remove [find src-address=10.100.x.x]`

## 5. HTTPS / UDP / QUIC
- The current script only redirects TCP Port 80 (HTTP).
- Modern web (Google, Facebook, YouTube) uses HTTPS (Port 443) or QUIC (UDP Port 443).
- The script has a `Reject HTTPS` rule, but check if it's actually catching traffic.
- If it's not catching traffic, they might be using DoH (DNS over HTTPS) or QUIC.

## 6. IPv6
- If the user has IPv6, this IPv4 firewall won't stop them.
**Action:**
- Check if IPv6 is enabled and active for the user.

## 7. Profile Assignment
- Verify the user is actually getting the IP address from the `DROPPOOL` (10.100.x.x).
- Check `/ppp active print`. If they still have their old IP, the isolation won't work because the firewall rules target `10.100.1.0/24`.
