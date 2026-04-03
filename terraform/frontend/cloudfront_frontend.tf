# ---------------------------------------------------------------------------
# CloudFront distribution — Frontend (React app)
# Origin: S3 static website endpoint
# Purpose: serve the React app over HTTPS with CDN caching
#
# Why S3 website endpoint (not the regular bucket endpoint):
#   The regular S3 endpoint does not honor the error_document setting.
#   React Router paths like /dashboard would return XML 404 from S3.
#   The website endpoint returns index.html for unknown paths, letting
#   React Router handle routing in the browser.
# ---------------------------------------------------------------------------
resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  default_root_object = "index.html"
  comment             = "${var.app_name} frontend"

  # ---------------------------------------------------------------------------
  # Origin — where CloudFront fetches content from
  # ---------------------------------------------------------------------------
  origin {
    # aws_s3_bucket_website_configuration exposes website_endpoint — the S3
    # website URL without the http:// prefix. CloudFront needs just the domain.
    domain_name = aws_s3_bucket_website_configuration.frontend.website_endpoint
    origin_id   = "s3-frontend"

    # S3 website endpoints only speak HTTP on port 80 — they have no SSL cert.
    # CloudFront connects to S3 over HTTP on the backend (stays within AWS
    # internal network — safe). Users still get HTTPS on their end.
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # ---------------------------------------------------------------------------
  # Default cache behavior — how CloudFront handles all requests
  # ---------------------------------------------------------------------------
  default_cache_behavior {
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https" # HTTP visitors get redirected to HTTPS

    allowed_methods = ["GET", "HEAD"]   # static files — read only
    cached_methods  = ["GET", "HEAD"]

    # CachingOptimized — AWS managed policy ID (safe to hardcode, never changes)
    # Caches files aggressively at edge locations.
    # Safe because Vite generates content-hashed filenames (index-abc123.js).
    # New build = new filename = automatic cache bust — no stale JS ever served.
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  # ---------------------------------------------------------------------------
  # Price class — which edge locations serve your content
  # PriceClass_100 = North America + Europe only (cheapest, misses Asia)
  # PriceClass_200 = + Asia, Middle East, Africa (covers Bangladesh users)
  # PriceClass_All = all 400+ edge locations (most expensive)
  # ---------------------------------------------------------------------------
  price_class = "PriceClass_200"

  # Required block — no geographic restrictions on who can access the app
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Use CloudFront's default *.cloudfront.net SSL certificate — free.
  # For a custom domain (app.yourdomain.com), you'd use acm_certificate_arn
  # pointing to an ACM certificate instead.
  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "${var.app_name}-frontend-cdn"
  }

  # S3 bucket and website configuration must exist before CloudFront can
  # use the website_endpoint as its origin domain
  depends_on = [aws_s3_bucket_website_configuration.frontend]
}
