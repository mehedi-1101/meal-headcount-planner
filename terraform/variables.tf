variable "aws_region" {
  description = "AWS region"
  default     = "ap-south-1"
}

variable "instance_type" {
  description = "EC2 instance type"
  default     = "t2.micro"
}

variable "key_pair_name" {
  description = "Name of the existing EC2 key pair"
  default     = "mehedi-mhp-key"
}

variable "app_name" {
  description = "Short name used to tag and name all resources Terraform creates"
  default     = "mehedi-mhp-tf"
}
