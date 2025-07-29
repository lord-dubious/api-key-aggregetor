# Proxy Configuration Guide

This comprehensive guide covers everything you need to know about configuring and managing proxies with the Gemini API Key Aggregator Proxy Plus extension.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Proxy Types & Formats](#proxy-types--formats)
- [Configuration Examples](#configuration-examples)
- [Popular Proxy Services](#popular-proxy-services)
- [Assignment Modes](#assignment-modes)
- [Management Interface](#management-interface)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## 🚀 Quick Start

### 1. Open Management Panel
```bash
# Via Command Palette
Ctrl+Shift+P (Windows/Linux) or Cmd+Shift+P (Mac)
> Gemini: Open Aggregator Panel
```

### 2. Add Your First Proxy
1. Scroll to the "Proxy Management" section
2. Enter proxy URL: `http://your-proxy.com:8080`
3. Click "Add" button
4. Verify status shows as "🟢 active"

### 3. Verify Assignment
- Check the "API Keys & Proxy Assignments" table
- Each API key should show an assigned proxy
- Use "Rebalance Proxy Assignments" if needed

## 🌐 Proxy Types & Formats

### Supported Protocols

| Protocol | Format | Port Range | Use Case |
|----------|--------|------------|----------|
| **HTTP** | `http://host:port` | 80, 8080, 3128 | Standard web proxies |
| **HTTPS** | `https://host:port` | 443, 8443 | Secure encrypted proxies |
| **SOCKS4** | `socks://host:port` | 1080 | TCP connections |
| **SOCKS5** | `socks5://host:port` | 1080 | TCP/UDP with auth |

### URL Format Rules

✅ **Valid Formats:**
```bash
# Basic HTTP/HTTPS
http://proxy.example.com:8080
https://secure-proxy.example.com:8443

# IP addresses
http://192.168.1.100:3128
https://10.0.0.50:8080

# SOCKS proxies
socks://socks-proxy.example.com:1080
socks5://socks5-proxy.example.com:1080

# With authentication
http://username:password@proxy.example.com:8080
https://user123:pass456@secure-proxy.example.com:8443

# Special characters (URL encoded)
http://user%40domain.com:p%40ssw0rd@proxy.example.com:8080
```

❌ **Invalid Formats:**
```bash
proxy.example.com:8080          # Missing protocol
http://proxy.example.com        # Missing port
ftp://proxy.example.com:21      # Unsupported protocol
http://proxy:8080/path          # Path not allowed
ws://proxy.example.com:8080     # WebSocket not supported
```

## 🔧 Configuration Examples

### Basic Datacenter Setup
```bash
# Multiple HTTP proxies for load distribution
http://datacenter1.provider.com:8080
http://datacenter2.provider.com:8080
http://datacenter3.provider.com:8080
```

### Mixed Protocol Configuration
```bash
# Combine different proxy types
http://http-proxy.provider.com:8080
https://secure-proxy.provider.com:8443
socks5://socks-proxy.provider.com:1080
```

### Geographic Distribution
```bash
# Proxies from different regions
http://us-east.provider.com:8080      # US East Coast
http://us-west.provider.com:8080      # US West Coast
http://eu-central.provider.com:8080   # Europe
http://asia-pacific.provider.com:8080 # Asia Pacific
```

### High-Performance Setup
```bash
# Premium proxies with authentication
https://premium1:secret123@high-speed.provider.com:8443
https://premium2:secret456@high-speed.provider.com:8443
https://premium3:secret789@high-speed.provider.com:8443
```

### Development/Testing Setup
```bash
# Local and test proxies
http://localhost:8080                 # Local proxy
http://test-proxy.local:3128         # Test environment
socks5://dev-proxy.internal:1080     # Development SOCKS
```

## 🏢 Popular Proxy Services

### Residential Proxies

#### Bright Data (Luminati)
```bash
# Rotating residential
http://session-user123:password@zproxy.lum-superproxy.io:22225

# Sticky session (same IP for duration)
http://session-user123-session-rand456:password@zproxy.lum-superproxy.io:22225

# Country-specific
http://session-user123-country-us:password@zproxy.lum-superproxy.io:22225
```

#### Oxylabs
```bash
# Rotating residential
http://customer-user:password@pr.oxylabs.io:7777

# Sticky session
http://customer-user-session-rand123:password@pr.oxylabs.io:7777

# Country targeting
http://customer-user-country-us:password@pr.oxylabs.io:7777
```

#### Smartproxy
```bash
# Rotating endpoint
http://user:password@gate.smartproxy.com:7000

# Sticky session
http://user-session-rand123:password@gate.smartproxy.com:7000

# City targeting
http://user-city-newyork:password@gate.smartproxy.com:7000
```

### Datacenter Proxies

#### ProxyMesh
```bash
# US locations
http://user:pass@us-wa.proxymesh.com:31280
http://user:pass@us-ca.proxymesh.com:31280
http://user:pass@us-il.proxymesh.com:31280

# International
http://user:pass@uk.proxymesh.com:31280
http://user:pass@de.proxymesh.com:31280
```

#### Storm Proxies
```bash
# Rotating datacenter
http://user:pass@rotating-datacenter.stormproxies.com:8080

# Dedicated datacenter
http://user:pass@dedicated-datacenter.stormproxies.com:8080
```

### Mobile Proxies

#### Proxy-Seller
```bash
# Mobile 4G/5G proxies
http://user:pass@mobile.proxy-seller.com:10000
http://user:pass@mobile-us.proxy-seller.com:10001
```

#### ProxyEmpire
```bash
# Mobile SOCKS5
socks5://user:pass@mobile.proxyempire.io:9001
socks5://user:pass@mobile-eu.proxyempire.io:9002
```

## ⚙️ Assignment Modes

### Dedicated Assignment (Recommended)

**How it works:**
- Each API key gets its own assigned proxy
- Requests always use the same proxy for consistency
- Better rate limit management and performance

**Benefits:**
- 🎯 **Consistent IP**: Same IP per API key
- 📊 **Better Analytics**: Clear usage patterns
- 🚀 **Optimal Performance**: No proxy switching overhead
- 🛡️ **Rate Limit Isolation**: Each key uses different IP

**Configuration:**
```bash
# In management panel:
☐ Enable rotating proxy mode  # Leave unchecked
```

### Rotating Mode (Legacy)

**How it works:**
- All API keys share the proxy pool
- Proxies are used in rotation for each request
- Simpler but less optimal

**Benefits:**
- 🔄 **Simple Setup**: One pool for all keys
- 🧪 **Good for Testing**: Quick development setup

**Configuration:**
```bash
# In management panel:
☑ Enable rotating proxy mode  # Check this box
```

## 🖥️ Management Interface

### Proxy Management Section

#### Adding Proxies
1. **Input Field**: Enter proxy URL
2. **Validation**: Automatic format checking
3. **Add Button**: Click to add to pool
4. **Status Check**: Automatic health verification

#### Proxy Table Columns
- **URL**: Proxy server address
- **Status**: 🟢 Active, 🔴 Error, ⚪ Inactive
- **Assigned Keys**: Number of API keys using this proxy
- **Last Updated**: When proxy was last modified
- **Actions**: Edit, Delete buttons

#### Control Buttons
- **Rebalance Proxy Assignments**: Redistribute keys evenly
- **Enable rotating proxy mode**: Toggle assignment mode

### API Keys Table

#### Columns Explained
- **Key ID**: Unique identifier for the API key
- **API Key**: Last 4 characters of your key (for security)
- **Proxy Assignment**: Currently assigned proxy with dropdown to change
- **Last Called**: When this key was last used
- **Status**: available, cooling_down, disabled
- **Rate Limits**: Current usage and remaining quota

#### Proxy Assignment Dropdown
- **No proxy**: Direct connection to Google API
- **Proxy options**: Available proxies with assignment count
- **Manual vs Auto**: Icons show assignment type
  - 🔧 Manual: You selected this proxy
  - ⚡ Auto: System assigned for load balancing

### Status Indicators

#### Proxy Status
- 🟢 **Active**: Working normally
- 🔴 **Error**: Connection issues detected
- ⚪ **Inactive**: Temporarily disabled
- ⓘ **Info Icon**: Hover for error details

#### Assignment Status
- **Auto assignment**: System-managed load balancing
- **Manual assignment**: User-selected proxy
- **Direct connection**: No proxy assigned

## 🔧 Troubleshooting

### Common Issues

#### Proxy Connection Failed
```bash
# Test proxy manually
curl -x http://proxy:port https://httpbin.org/ip

# Expected output: Different IP than your real IP
{
  "origin": "proxy.ip.address"
}
```

#### Authentication Issues
```bash
# Test with credentials
curl -x http://user:pass@proxy:port https://httpbin.org/ip

# URL encode special characters
# @ becomes %40, : becomes %3A
http://user%40domain.com:p%40ssw0rd@proxy:port
```

#### High Error Rates
1. **Check Provider Status**: Visit provider's status page
2. **Test Different Endpoints**: Try alternative proxy servers
3. **Verify Credentials**: Ensure username/password are correct
4. **Check Quota**: Verify you haven't exceeded limits

#### Slow Performance
```bash
# Test response time
time curl -x http://proxy:port https://httpbin.org/ip

# Should be < 3 seconds for good performance
# > 5 seconds indicates issues
```

### Diagnostic Commands

#### Network Connectivity
```bash
# Test basic connectivity
telnet proxy.example.com 8080

# Test HTTP CONNECT method
curl -v -x http://proxy:port https://httpbin.org/ip

# Check DNS resolution
nslookup proxy.example.com
```

#### Proxy Performance
```bash
# Measure response time components
curl -w "@curl-format.txt" -x http://proxy:port https://httpbin.org/ip

# Create curl-format.txt:
echo "time_namelookup: %{time_namelookup}
time_connect: %{time_connect}
time_appconnect: %{time_appconnect}
time_pretransfer: %{time_pretransfer}
time_starttransfer: %{time_starttransfer}
time_total: %{time_total}" > curl-format.txt
```

### Useful Testing Resources

#### IP Checking Services
- **WhatIsMyIP**: https://whatismyipaddress.com/
- **IP Geolocation**: https://ipinfo.io/ip
- **Proxy Testing**: https://httpbin.org/ip

#### Community & Support

### Getting Help
- **Documentation**: README.md and TROUBLESHOOTING.md
- **GitHub Issues**: https://github.com/lord-dubious/api-key-aggregetor/issues
- **GitHub Discussions**: https://github.com/lord-dubious/api-key-aggregetor/discussions

## 🏆 Best Practices

### Security Considerations

#### Credential Management
- **Unique Passwords**: Use different passwords for each proxy service
- **Regular Rotation**: Change credentials monthly
- **Secure Storage**: Never commit credentials to code
- **Access Control**: Limit who has proxy credentials

#### Network Security
- **HTTPS Preferred**: Use HTTPS proxies when available
- **IP Whitelisting**: Configure provider IP restrictions
- **Monitor Usage**: Watch for unexpected traffic patterns
- **Audit Logs**: Review proxy access logs regularly

### Performance Optimization

#### Quality Indicators
- **Success Rate**: Should be > 95%
- **Response Time**: Should be < 2 seconds average
- **Error Rate**: Should be < 5%
- **Uptime**: Should be > 99% availability

#### Maintenance & Monitoring
- **Regular Checks**: Weekly review of performance
- **Quarterly Evaluation**: Rotate credentials and update proxies
- **Monthly Updates**: Review error rates and performance

### Scaling Guidelines

#### Project Sizing
- **Small Projects**: 1-3 API keys, 2-3 proxies
- **Medium Projects**: 3-10 API keys, 5-10 proxies
- **Large Projects**: 10+ API keys, 10+ proxies

#### Optimal Setup Strategy
```bash
# Basic Setup
# 3-5 API keys for most use cases
# 1-2 proxies per API key
# Geographic distribution across regions
# Mix of proxy types (HTTP, HTTPS, SOCKS)
```

### Configuration Best Practices

#### Proxy Selection
- **Geographic Diversity**: Multiple regions
- **Provider Reliability**: > 99% uptime
- **Avoid Free Proxies**: These are often unreliable and compromised
- **Use Dedicated Accounts**: Shared credentials are often compromised
- **Monitor Overloaded Proxies**: Assign based on key count

---

## 📞 Support & Resources

### Getting Help
- **Documentation**: README.md and TROUBLESHOOTING.md
- **GitHub Issues**: https://github.com/lord-dubious/api-key-aggregetor/issues
- **GitHub Discussions**: https://github.com/lord-dubious/api-key-aggregetor/discussions

---

**Version**: January 2025 Updated
**Last Updated**: July 2025