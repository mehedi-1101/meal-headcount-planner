variable "aws_region" {
  description = "AWS region — must match where EC2 and DynamoDB are deployed"
  default     = "ap-south-1"
}

variable "app_name" {
  description = "Short name used to tag and name all resources Terraform creates"
  default     = "mehedi-mhp-tf"
}

variable "bucket_name" {
  description = "S3 bucket name — globally unique across all AWS accounts"
  default     = "mehedi-mhp-tf-frontend"
}

variable "ec2_domain" {
  description = "EC2 origin domain for the API CloudFront distribution. CloudFront does not accept raw IPs — use nip.io format: <ip>.nip.io"
  default     = "65.0.5.138.nip.io"
}
