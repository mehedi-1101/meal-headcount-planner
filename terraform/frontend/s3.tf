# ---------------------------------------------------------------------------
# S3 bucket — stores the built React app (HTML, JS, CSS)
# ---------------------------------------------------------------------------
resource "aws_s3_bucket" "frontend" {
  bucket = var.bucket_name

  # force_destroy = true allows Terraform to delete the bucket even when it
  # contains files. Without this, terraform destroy fails with BucketNotEmpty
  # if you've uploaded the frontend build. Safe for non-production buckets.
  force_destroy = true

  tags = {
    Name = "${var.app_name}-frontend"
  }
}

# ---------------------------------------------------------------------------
# Disable block public access — required before adding a public bucket policy
# By default AWS blocks all public access. We turn this off so S3 can serve
# files publicly as a static website.
# ---------------------------------------------------------------------------
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# ---------------------------------------------------------------------------
# Static website hosting — turns the bucket into an HTTP file server
# index_document: file served at the root URL /
# error_document: file served on 404 — must be index.html for React Router
#   (React Router is client-side — all paths must serve index.html so the
#    app loads and React Router reads the URL to show the right page)
# ---------------------------------------------------------------------------
resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

# ---------------------------------------------------------------------------
# Bucket policy — grants public read to all objects
# Without this, even with block_public_access off, files are still private.
# Principal "*" = everyone (the whole internet)
# Action s3:GetObject = read/download files only (not upload or delete)
# Resource with /* = all objects inside the bucket
# depends_on: policy must be applied after public access block is disabled,
#   otherwise AWS rejects the public policy
# ---------------------------------------------------------------------------
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.frontend]
}
