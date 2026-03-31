terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ── Data source: look up the latest Amazon Linux 2023 AMI ───────────────────
# Instead of hardcoding an AMI ID (which changes per region and over time),
# we ask AWS for the current one at apply time.
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ── IAM role — lets EC2 call DynamoDB and SSM without hardcoded credentials ──
resource "aws_iam_role" "ec2_role" {
  name = "${var.app_name}-ec2-role"

  # Trust policy: only EC2 service can assume this role
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "dynamodb" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess"
}

# Instance profile wraps the role so EC2 can actually use it
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.app_name}-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

# ── Security group — instance-level firewall ─────────────────────────────────
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

  # HTTP — Nginx listens here, forwards to uvicorn internally
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound — needed for dnf, git clone, SSM, DynamoDB calls
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ── User Data script — runs once on first boot, sets up the entire server ────
locals {
  user_data = <<-EOF
    #!/bin/bash
    set -e

    # 1. System packages
    dnf install -y python3.11 python3.11-pip git nginx

    # 2. Clone repo
    git clone -b python-aws-infra https://github.com/mehedi-1101/meal-headcount-planner.git /home/ec2-user/meal-headcount-planner
    chown -R ec2-user:ec2-user /home/ec2-user/meal-headcount-planner

    # 3. Install Python dependencies
    cd /home/ec2-user/meal-headcount-planner/mhp-python
    python3.11 -m pip install -r requirements.txt

    # 4. Fetch JWT secret from SSM → write .env
    JWT_SECRET=$(aws ssm get-parameter \
        --name "/mehedi/mhp/jwt-secret" \
        --with-decryption \
        --region ap-south-1 \
        --query "Parameter.Value" \
        --output text)

    cat > /home/ec2-user/meal-headcount-planner/mhp-python/.env << ENVEOF
    JWT_SECRET_KEY=$${JWT_SECRET}
    JWT_ALGORITHM=HS256
    JWT_EXPIRE_MINUTES=480
    AWS_REGION=ap-south-1
    DYNAMODB_TABLE=mhp
    ENVEOF

    chown ec2-user:ec2-user /home/ec2-user/meal-headcount-planner/mhp-python/.env

    # 5. Create systemd service
    cat > /etc/systemd/system/mhp.service << SVCEOF
    [Unit]
    Description=MHP FastAPI app
    After=network.target

    [Service]
    User=ec2-user
    WorkingDirectory=/home/ec2-user/meal-headcount-planner/mhp-python
    ExecStart=/usr/bin/python3.11 -m uvicorn app.main:app --host 127.0.0.1 --port 8000
    Restart=always
    RestartSec=5

    [Install]
    WantedBy=multi-user.target
    SVCEOF

    # 6. Enable + start service
    systemctl daemon-reload
    systemctl enable mhp
    systemctl start mhp

    # 7. Configure nginx
    cat > /etc/nginx/conf.d/mhp.conf << NGINXEOF
    server {
        listen 80;

        location / {
            proxy_pass http://127.0.0.1:8000;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
        }
    }
    NGINXEOF

    # 8. Start nginx
    systemctl enable nginx
    systemctl start nginx
  EOF
}

# ── EC2 instance ─────────────────────────────────────────────────────────────
resource "aws_instance" "mhp" {
  ami                    = data.aws_ami.amazon_linux_2023.id
  instance_type          = var.instance_type
  key_name               = var.key_pair_name
  vpc_security_group_ids = [aws_security_group.mhp.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name
  user_data              = local.user_data

  tags = {
    Name = "${var.app_name}-server"
  }
}
