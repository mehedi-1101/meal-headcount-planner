# User Data script — runs once automatically on first boot as root.
# Fully bootstraps the server: installs dependencies, clones repo,
# fetches JWT secret from SSM, configures systemd + Nginx.
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
