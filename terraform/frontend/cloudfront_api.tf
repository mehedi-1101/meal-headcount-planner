# ---------------------------------------------------------------------------
# CloudFront distribution — API proxy
# Origin: EC2 Nginx via nip.io domain
# Purpose: give EC2 an HTTPS endpoint so the browser's Mixed Content policy
#          is not violated (browsers block HTTP calls from HTTPS pages)
#
# Why nip.io:
#   CloudFront does not accept raw IP addresses as custom origins — it
#   requires a resolvable domain name. nip.io is a free wildcard DNS service
#   where <ip>.nip.io always resolves to that IP. So 13.203.157.238.nip.io
#   is a valid domain that points to EC2. No signup or configuration needed.
#
# Why a separate distribution (not a path-based behavior on the frontend one):
#   Separate distributions have separate cache policies, origin settings, and
#   behaviors. Mixing frontend (aggressive caching) and API (no caching) in
#   one distribution via path rules is harder to reason about and change.
# ---------------------------------------------------------------------------
resource "aws_cloudfront_distribution" "api" {
  enabled = true
  comment = "${var.app_name} API proxy"

  origin {
    domain_name = var.ec2_domain  # e.g. 13.203.157.238.nip.io
    origin_id   = "ec2-api"

    # EC2 Nginx has no SSL certificate — listens on port 80 only.
    # Setting https-only here causes 504 — EC2 can't answer HTTPS.
    # http-only: CloudFront → EC2 over HTTP (internal network), safe.
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "ec2-api"
    viewer_protocol_policy = "redirect-to-https"

    # APIs need all HTTP methods:
    # GET — fetch meals, headcount, settings
    # POST — login, opt-in, opt-out, override
    # PUT — update settings, work location
    # DELETE — delete special days
    # OPTIONS — CORS preflight (browser sends this before every cross-origin request)
    allowed_methods = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods  = ["GET", "HEAD"]

    # CachingDisabled — AWS managed policy ID (never changes)
    # Every API request passes through to EC2 — no caching at all.
    # If CloudFront cached a login response, every user would get the same token.
    # If CloudFront cached a headcount response, admins would see stale counts.
    cache_policy_id = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"

    # AllViewer — AWS managed policy ID (never changes)
    # Forwards ALL request headers from the browser to EC2 exactly as received.
    # Two headers are critical:
    #   Origin: FastAPI reads this to know which domain is calling and adds
    #           Access-Control-Allow-Origin to the response. Without it, CORS fails.
    #   Authorization: carries the JWT token so FastAPI can authenticate the user.
    # Without AllViewer, CloudFront strips these headers before forwarding.
    origin_request_policy_id = "216adef6-5c7f-47e4-b989-5492eafa07d3"
  }

  price_class = "PriceClass_200"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "${var.app_name}-api-cdn"
  }
}
