# EC2 instance — references resources defined in iam.tf, security_groups.tf,
# data.tf, and locals.tf. Terraform resolves dependencies automatically.
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
