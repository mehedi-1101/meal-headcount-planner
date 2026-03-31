# Outputs are printed after terraform apply completes.
# Useful for immediately knowing the public IP without going to the console.

output "instance_public_ip" {
  description = "Public IP of the EC2 instance — use this to SSH and access /docs"
  value       = aws_instance.mhp.public_ip
}

output "instance_id" {
  description = "EC2 instance ID — useful for aws cli commands"
  value       = aws_instance.mhp.id
}

output "docs_url" {
  description = "FastAPI Swagger UI URL"
  value       = "http://${aws_instance.mhp.public_ip}/docs"
}
