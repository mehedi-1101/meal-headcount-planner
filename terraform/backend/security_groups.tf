# Instance-level firewall. AWS blocks all inbound traffic by default —
# only the ports explicitly opened here are reachable from the internet.
resource "aws_security_group" "mhp" {
  name        = "${var.app_name}-sg"
  description = "MHP app security group (Terraform-managed)"

  # SSH — for manual inspection if needed
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP — Nginx listens here, forwards internally to uvicorn on port 8000
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound — needed for dnf installs, git clone, SSM, DynamoDB calls
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
