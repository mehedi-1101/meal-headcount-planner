# IAM role — grants EC2 permission to call DynamoDB and SSM.
# Using a role means no hardcoded credentials anywhere on the server.
# boto3 picks up the role automatically when running on EC2.
resource "aws_iam_role" "ec2_role" {
  name = "${var.app_name}-ec2-role"

  # Trust policy: only the EC2 service can assume this role
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

# Instance profile wraps the IAM role so it can be attached to an EC2 instance.
# EC2 cannot use an IAM role directly — it needs this profile wrapper.
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.app_name}-ec2-profile"
  role = aws_iam_role.ec2_role.name
}
