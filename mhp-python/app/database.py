"""
DynamoDB access layer.

All reads and writes go through this file. Services call these helpers
instead of touching boto3 directly — same idea as jsonStore.js in Node.

boto3 credential resolution order (automatic, no code needed):
  1. Environment variables (AWS_ACCESS_KEY_ID etc.)
  2. ~/.aws/credentials (set by `aws configure`)      ← local dev
  3. EC2 instance IAM role                             ← production on EC2
This means the same code works locally and on EC2 with zero changes.
"""

import os
import boto3
from boto3.dynamodb.conditions import Key
from dotenv import load_dotenv

load_dotenv()

# DynamoDB resource is higher-level than the client — lets us work with
# Python dicts directly instead of DynamoDB's typed attribute format.
_dynamodb = boto3.resource("dynamodb", region_name=os.getenv("AWS_REGION", "ap-south-1"))
_table = _dynamodb.Table(os.getenv("DYNAMODB_TABLE", "mhp"))


# ---------------------------------------------------------------------------
# Generic helpers
# ---------------------------------------------------------------------------

def get_item(pk: str, sk: str) -> dict | None:
    """Fetch a single item by its exact PK + SK. Returns None if not found."""
    resp = _table.get_item(Key={"PK": pk, "SK": sk})
    return resp.get("Item")


def put_item(item: dict) -> None:
    """Write (create or fully overwrite) an item."""
    _table.put_item(Item=item)


def delete_item(pk: str, sk: str) -> None:
    _table.delete_item(Key={"PK": pk, "SK": sk})


def query_by_pk(pk: str, sk_prefix: str | None = None) -> list[dict]:
    """
    Fetch all items for a PK, optionally filtering SK by prefix.
    Example: query_by_pk("DATE#2026-03-01", "MEAL#") returns all meal
    records for that date.
    """
    if sk_prefix:
        resp = _table.query(
            KeyConditionExpression=Key("PK").eq(pk) & Key("SK").begins_with(sk_prefix)
        )
    else:
        resp = _table.query(KeyConditionExpression=Key("PK").eq(pk))
    return resp.get("Items", [])


def scan_with_filter(filter_expression) -> list[dict]:
    """
    Full table scan with a filter. Only used for login (find user by username).
    Acceptable at ~100 users — would need a GSI at larger scale.

    boto3's Attr() builder handles value substitution internally — no need
    to pass ExpressionAttributeValues separately.
    """
    resp = _table.scan(FilterExpression=filter_expression)
    return resp.get("Items", [])


# ---------------------------------------------------------------------------
# Key builders — centralise PK/SK construction so there's one place to change
# ---------------------------------------------------------------------------

def user_pk(user_id: str) -> str:
    return f"USER#{user_id}"

def date_pk(date: str) -> str:
    return f"DATE#{date}"

def meal_sk(user_id: str, meal_type: str) -> str:
    return f"MEAL#{user_id}#{meal_type}"

def location_sk(user_id: str) -> str:
    return f"LOC#{user_id}"

def audit_pk(month: str) -> str:
    """month = YYYY-MM"""
    return f"AUDIT#{month}"

def audit_sk(timestamp: str, user_id: str) -> str:
    return f"LOG#{timestamp}#{user_id}"
