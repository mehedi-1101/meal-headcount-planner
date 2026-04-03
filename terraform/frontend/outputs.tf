# Outputs are printed in the terminal after terraform apply completes.
# Useful for immediately knowing the URLs without opening the AWS console.

output "frontend_url" {
  description = "React app URL — share this with users"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "api_url" {
  description = "API CloudFront URL — use as VITE_API_URL when building the frontend"
  value       = "https://${aws_cloudfront_distribution.api.domain_name}"
}

output "s3_website_endpoint" {
  description = "Direct S3 website URL (HTTP only) — useful for debugging without CloudFront"
  value       = "http://${aws_s3_bucket_website_configuration.frontend.website_endpoint}"
}

output "s3_bucket_name" {
  description = "S3 bucket name — use with aws s3 sync to upload the frontend build"
  value       = aws_s3_bucket.frontend.bucket
}

output "frontend_build_command" {
  description = "PowerShell command to build and deploy the frontend after terraform apply"
  value       = "$env:VITE_API_URL=\"https://${aws_cloudfront_distribution.api.domain_name}\"; npm run build"
}
