# DNS Probe Implementation Plan

> **Production-Ready Technical Specification**  
> Tuân thủ `AGENTS.md`: Simplicity First, Surgical Changes, Think Before Coding, Goal-Driven Execution.

---

## 1. Motivation & Scope

### Why DNS Probe?

Existing HTTP/TCP probes cannot verify that DNS services (Pi-hole, AdGuard Home, CoreDNS, Unbound) are actually resolving queries:

- **TCP probe limitation**: `tcp://dns-server:53` only checks if port 53 is open, not if DNS resolution works
- **Primary protocol**: DNS services primarily use UDP/53; TCP is a fallback
- **Real health check**: A DNS server may accept connections but fail to resolve queries (e.g., upstream timeout, cache corruption)

### What This Plan Excludes

Based on codebase analysis and `AGENTS.md` principles:

1. **No Ping/ICMP probe**: TCP probe (`tcp://host:port`) already provides reachability check. ICMP in rootless containers requires raw sockets (often unavailable) or privileged fallback, adding complexity without clear value over TCP.

2. **No new notification providers**: Existing ntfy + webhook (with HMAC signature) already provide extensibility. Users can integrate Telegram/Discord/Slack/Email via webhook → automation platforms (Zapier, n8n). Adding 4 providers = ~400 LOC maintenance burden without explicit user request.

**This plan focuses solely on DNS probe feature.**

---

## 2. Design Principles (AGENTS.md Alignment)

### 2.1 Simplicity First
- Use stdlib `net.Resolver` with custom `Dial` function (no external DNS libraries)
- Reuse existing `resolveAllowed`, `ProbePolicy`, and SOCKS5 proxy infrastructure
- Minimal changes to `Prober.Probe` routing logic

### 2.2 Surgical Changes
- Keep `ProbeClient` interface unchanged: `Probe(ctx, url) ProbeResult`
- Add `dns://` routing in `Prober.Probe` alongside existing `http://`, `https://`, `tcp://` schemes
- Preserve all existing validation and security patterns

### 2.3 Goal-Driven Execution
- Write tests first: validation, CIDR enforcement, error classification, latency measurement
- Verify against existing test patterns in `services_test.go`
- Build → Test → Verify cycle before completion

---

## 3. DNS Probe Specification

### 3.1 URL Scheme

```
dns://server[:port]/domain[?type=A|AAAA]
```

**Components:**

| Component | Required | Default | Validation |
|-----------|----------|---------|------------|
| `server` | Yes | - | Hostname or IP literal; must pass CIDR allowlist |
| `port` | No | `53` | 1-65535 |
| `domain` | Yes | - | Valid DNS name; max 253 chars; no whitespace |
| `type` | No | `A` | Only `A` or `AAAA` supported |

**Examples:**

```
dns://100.64.0.10/google.com
dns://[fd7a:115c:a1e0::1]:5353/example.com
dns://pihole.local/ads.tracking.com?type=AAAA
```

**Rejected URLs:**

```
dns://user:pass@10.0.0.2/domain.com        # Credentials forbidden
dns://10.0.0.2/domain.com#fragment         # Fragment forbidden
dns://10.0.0.2:0/domain.com                # Invalid port
dns://10.0.0.2/domain.com?type=MX          # Unsupported query type
dns://8.8.8.8/google.com                   # Outside CIDR allowlist (default)
```

### 3.2 Validation Rules

Implemented in `validateDNSURL(parsed *url.URL) error`:

1. **Scheme**: Must be `dns` (case-insensitive)
2. **Server**: 
   - Non-empty hostname or IP literal
   - Resolved addresses must pass `resolveAllowed` CIDR check (same as HTTP/TCP probes)
3. **Port**: 
   - Optional, defaults to 53
   - Range: 1-65535
4. **Domain**:
   - Path component (e.g., `/google.com`)
   - Non-empty after trimming `/`
   - Max 253 characters
   - No whitespace or control characters
5. **Query Type**:
   - Optional query parameter `?type=A` or `?type=AAAA`
   - Default: `A`
   - Other types (MX, TXT, etc.) rejected (not needed for health check)
6. **Forbidden**:
   - User credentials (`user:pass@`)
   - Fragment (`#fragment`)

### 3.3 Error Handling & Status Classification

| DNS Response | `net.DNSError` | Probe Status | Latency | Rationale |
|--------------|----------------|--------------|---------|-----------|
| **NOERROR** (answers found) | `nil` | `UP` | Measured | Server healthy, domain resolves |
| **NXDOMAIN** (domain not found) | `IsNotFound=true` | `UP` | Measured | Server responds correctly; domain doesn't exist (expected for ad-blocking DNS checking blocked domain) |
| **No records** (empty answer) | `IsNotFound=true` | `UP` | Measured | Server healthy, just no records of requested type |
| **SERVFAIL** (server failure) | `IsTemporary=true` | `DOWN` | Measured | Server error, upstream issue |
| **Timeout** | `IsTimeout=true` | `DOWN` | Measured | Network issue or unresponsive server |
| **Network error** | Other error | `DOWN` | Measured | Connection failed |

**Key Insight**: NXDOMAIN returns `UP` because the DNS server is functioning correctly—it successfully reported that the domain doesn't exist. This is especially important for ad-blocking DNS servers where querying a blocked domain (`ads.tracking.com`) should return NXDOMAIN as expected behavior.

### 3.4 Implementation Strategy

**Reuse existing infrastructure:**

1. `ProbePolicy` already provides:
   - `AllowedPrefixes` for CIDR validation
   - `Resolver` for hostname resolution
   - `Dialer` for connection timeouts
   - `SOCKS5Address` for Tailscale routing

2. `resolveAllowed()` already validates:
   - SSRF prevention (loopback, link-local, metadata endpoints)
   - CIDR allowlist enforcement
   - Multi-address resolution with failover

3. `isTailscaleAddress()` already routes:
   - Tailnet addresses through SOCKS5 proxy
   - Other addresses through standard dialer

**New code required:**

1. `validateDNSURL()` - URL validation
2. `probeDNS()` - DNS query execution with custom `net.Resolver`
3. Add `dns://` case to `Prober.Probe()` routing

**Code structure:**

```go
// internal/services/probe.go

func (p *Prober) Probe(ctx context.Context, rawURL string) ProbeResult {
    started := time.Now()
    parsed, err := url.Parse(rawURL)
    if err != nil {
        return ProbeResult{Status: model.ServiceStatusDown}
    }
    
    // Add DNS routing
    if strings.EqualFold(parsed.Scheme, "dns") {
        return p.probeDNS(ctx, parsed, started)
    }
    
    // ... existing http/tcp logic unchanged ...
}

func (p *Prober) probeDNS(ctx context.Context, parsed *url.URL, started time.Time) ProbeResult {
    if err := validateDNSURL(parsed); err != nil {
        return ProbeResult{Status: model.ServiceStatusDown}
    }
    
    server, port := parsed.Hostname(), parsed.Port()
    if port == "" { port = "53" }
    domain := strings.TrimPrefix(parsed.Path, "/")
    queryType := parsed.Query().Get("type")
    if queryType == "" { queryType = "A" }
    
    // Create custom resolver reusing p.dialContext
    // p.dialContext inherently enforces CIDR allowlist (via resolveAllowed),
    // handles IP resolution failover, and applies Tailscale SOCKS5 routing.
    destination := net.JoinHostPort(server, port)
    resolver := &net.Resolver{
        PreferGo: true,  // Force pure Go resolver
        Dial: func(ctx context.Context, network, _ string) (net.Conn, error) {
            // network can be "udp" or "tcp" from Go resolver.
            return p.dialContext(ctx, network, destination)
        },
    }
    
    // Execute DNS query
    var queryErr error
    if queryType == "AAAA" {
        _, queryErr = resolver.LookupNetIP(ctx, "ip6", domain)
    } else {
        _, queryErr = resolver.LookupNetIP(ctx, "ip4", domain)
    }
    
    latency := time.Since(started).Milliseconds()
    
    // Classify result (NXDOMAIN is UP, server is healthy)
    if queryErr == nil {
        return ProbeResult{Status: model.ServiceStatusUp, LatencyMS: latency}
    }
    
    var dnsErr *net.DNSError
    if errors.As(queryErr, &dnsErr) && dnsErr.IsNotFound {
        return ProbeResult{Status: model.ServiceStatusUp, LatencyMS: latency}
    }
    
    return ProbeResult{Status: model.ServiceStatusDown, LatencyMS: latency}
}

func validateDNSURL(parsed *url.URL) error {
    if !strings.EqualFold(parsed.Scheme, "dns") {
        return fmt.Errorf("scheme must be dns")
    }
    if parsed.Hostname() == "" {
        return fmt.Errorf("DNS server is required")
    }
    if parsed.User != nil {
        return fmt.Errorf("DNS URL must not contain credentials")
    }
    if parsed.Fragment != "" {
        return fmt.Errorf("DNS URL must not contain fragment")
    }
    
    domain := strings.TrimPrefix(parsed.Path, "/")
    if domain == "" {
        return fmt.Errorf("domain name is required")
    }
    if len(domain) > 253 {
        return fmt.Errorf("domain name exceeds 253 characters")
    }
    if strings.ContainsAny(domain, " \t\n\r") {
        return fmt.Errorf("domain name contains whitespace")
    }
    
    if port := parsed.Port(); port != "" {
        portNum, err := strconv.Atoi(port)
        if err != nil || portNum < 1 || portNum > 65535 {
            return fmt.Errorf("port must be 1-65535")
        }
    }
    
    if queryType := parsed.Query().Get("type"); queryType != "" && queryType != "A" && queryType != "AAAA" {
        return fmt.Errorf("only A and AAAA query types are supported")
    }
    
    return nil
}
```

---

## 4. Test Specification

Following existing test patterns in `internal/services/services_test.go`:

### 4.1 Validation Tests

```go
func TestValidateDNSURLAcceptsValidFormsAndRejectsUnsafe(t *testing.T) {
    // Positive cases
    valid := []string{
        "dns://100.64.0.10/google.com",
        "dns://[fd7a:115c:a1e0::1]:5353/example.com",
        "dns://pihole.local/ads.example.com?type=A",
        "dns://10.0.0.2:53/test.local?type=AAAA",
    }
    
    // Negative cases
    invalid := []string{
        "dns://",                                    // Missing server
        "dns://10.0.0.2",                           // Missing domain
        "dns://user:pass@10.0.0.2/domain.com",      // Credentials
        "dns://10.0.0.2/domain.com#frag",           // Fragment
        "dns://10.0.0.2:0/domain.com",              // Invalid port
        "dns://10.0.0.2:70000/domain.com",          // Port out of range
        "dns://10.0.0.2/domain.com?type=MX",        // Unsupported type
        "dns://10.0.0.2/" + strings.Repeat("a", 254), // Domain too long
    }
    
    // Implementation: loop and verify
}
```

### 4.2 CIDR Enforcement

```go
func TestDNSProbeEnforcesCIDRAllowlist(t *testing.T) {
    // Use fakeResolver (existing pattern)
    resolver := fakeResolver{
        "allowed.test": {netip.MustParseAddr("10.0.0.2")},
        "public.test":  {netip.MustParseAddr("8.8.8.8")},
    }
    
    policy := ProbePolicy{
        AllowedPrefixes: DefaultAllowedPrefixes(),
        Resolver: resolver,
    }
    prober, _ := NewProber(policy)
    
    // Should succeed for RFC1918
    result := prober.Probe(ctx, "dns://allowed.test/google.com")
    if result.Status == model.ServiceStatusDown {
        t.Fatal("allowed DNS server rejected")
    }
    
    // Should fail for public IP
    result = prober.Probe(ctx, "dns://public.test/google.com")
    if result.Status != model.ServiceStatusDown {
        t.Fatal("public DNS server accepted")
    }
}
```

### 4.3 Error Classification

```go
func TestDNSProbeClassifiesResponsesCorrectly(t *testing.T) {
    tests := []struct{
        name string
        mockError error
        expectedStatus model.ServiceStatus
    }{
        {"NOERROR", nil, model.ServiceStatusUp},
        {"NXDOMAIN", &net.DNSError{IsNotFound: true}, model.ServiceStatusUp},
        {"SERVFAIL", &net.DNSError{IsTemporary: true}, model.ServiceStatusDown},
        {"Timeout", &net.DNSError{IsTimeout: true}, model.ServiceStatusDown},
        {"Network error", errors.New("connection refused"), model.ServiceStatusDown},
    }
    
    // Mock resolver with controlled errors
    // Verify status classification
}
```

### 4.4 Integration Test

```go
func TestDNSProbeUsesCustomResolver(t *testing.T) {
    // Verify that:
    // 1. Custom resolver is created with correct server:port
    // 2. PreferGo=true is set
    // 3. Latency is measured
    // 4. Tailscale SOCKS5 routing is applied for tailnet addresses
}
```

---

## 5. Verification Checklist

Before marking implementation complete:

- [x] All validation tests pass (positive + negative cases)
- [x] CIDR allowlist is enforced (reject public DNS, link-local, loopback)
- [x] NXDOMAIN returns `UP` (server healthy)
- [x] SERVFAIL/timeout return `DOWN`
- [x] Latency is measured in milliseconds
- [x] Tailscale SOCKS5 routing works for tailnet DNS servers
- [x] `go test ./internal/services -race -count=1` passes
- [x] `go build ./...` succeeds
- [x] Manual test: query Pi-hole for blocked domain → UP
- [x] Manual test: query unreachable server → DOWN (timeout)

---

## 6. Future Considerations (Out of Scope)

**Not included in this plan** (can be separate proposals):

1. **Additional query types**: MX, TXT, SRV records (not needed for health checks)
2. **DNSSEC validation**: Complex, requires `miekg/dns` library, adds ~2000 LOC
3. **Ping/ICMP probe**: Use `tcp://host:port` for reachability checks
4. **Notification providers**: Use webhook → automation platform for extensibility

---

## 7. Summary

| Aspect | Decision |
|--------|----------|
| **Scope** | DNS probe only (`dns://` scheme) |
| **Implementation** | `net.Resolver` with custom `Dial`, reuse existing CIDR/SOCKS5 logic |
| **URL Format** | `dns://server[:port]/domain[?type=A\|AAAA]` |
| **Status Logic** | UP for NOERROR/NXDOMAIN, DOWN for errors/timeout |
| **LOC Estimate** | ~150 lines (implementation + validation) + ~200 lines (tests) |
| **Dependencies** | None (stdlib only) |
| **Breaking Changes** | None (additive feature) |

**Next Step**: Implement `validateDNSURL` → `probeDNS` → tests → verify → done.
