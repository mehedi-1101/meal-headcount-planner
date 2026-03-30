"""
Seed DynamoDB with initial users, teams, and settings from the Node.js data files.

Run from the mhp-python/ directory:
    python -m scripts.seed

What this does:
  - Creates all 33 users (PK=USER#<id>, SK=PROFILE)
  - Creates all 6 teams (PK=TEAM#<id>, SK=PROFILE)
  - Creates default settings (PK=SETTINGS, SK=CONFIG)

Passwords: all users share the same bcrypt hash from the Node.js seed,
which represents the password "password123".
You can change individual passwords later via the API or a separate script.

Safe to re-run — put_item overwrites existing items.
"""

import sys
import os

# Allow running as `python -m scripts.seed` from mhp-python/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import boto3
from dotenv import load_dotenv
from pwdlib import PasswordHash
from pwdlib.hashers.bcrypt import BcryptHasher

load_dotenv()

table_name = os.getenv("DYNAMODB_TABLE", "mhp")
region = os.getenv("AWS_REGION", "ap-south-1")

dynamodb = boto3.resource("dynamodb", region_name=region)
table = dynamodb.Table(table_name)

# ---------------------------------------------------------------------------
# Data (copied from backend/data/)
# ---------------------------------------------------------------------------

TEAMS = [
    {"id": "mimir",         "name": "Mimir"},
    {"id": "saga",          "name": "Saga"},
    {"id": "vimond",        "name": "Vimond"},
    {"id": "admin-account", "name": "Admin & Account"},
    {"id": "marketing",     "name": "Marketing"},
    {"id": "logistics",     "name": "Logistics"},
]

# Generate a fresh bcrypt hash using pwdlib — Node.js hash format is incompatible
_pwd = PasswordHash((BcryptHasher(),))
_HASH = _pwd.hash("password123")

USERS = [
    {"id": "u1000", "name": "Sarah Johnson",    "username": "sarah.j",    "role": "TEAM_LEAD",  "teamId": "mimir"},
    {"id": "u1001", "name": "Michael Chen",     "username": "michael.c",  "role": "EMPLOYEE",   "teamId": "mimir"},
    {"id": "u1002", "name": "Emily Rodriguez",  "username": "emily.r",    "role": "EMPLOYEE",   "teamId": "mimir"},
    {"id": "u1003", "name": "David Kim",        "username": "david.k",    "role": "EMPLOYEE",   "teamId": "mimir"},
    {"id": "u1004", "name": "Jessica Martinez", "username": "jessica.m",  "role": "EMPLOYEE",   "teamId": "mimir"},
    {"id": "u1005", "name": "Ryan Thompson",    "username": "ryan.t",     "role": "EMPLOYEE",   "teamId": "mimir"},
    {"id": "u1006", "name": "Amanda Foster",    "username": "amanda.f",   "role": "TEAM_LEAD",  "teamId": "saga"},
    {"id": "u1007", "name": "James Wilson",     "username": "james.w",    "role": "EMPLOYEE",   "teamId": "saga"},
    {"id": "u1008", "name": "Sophia Patel",     "username": "sophia.p",   "role": "EMPLOYEE",   "teamId": "saga"},
    {"id": "u1009", "name": "Daniel Brown",     "username": "daniel.b",   "role": "EMPLOYEE",   "teamId": "saga"},
    {"id": "u1010", "name": "Olivia Davis",     "username": "olivia.d",   "role": "EMPLOYEE",   "teamId": "saga"},
    {"id": "u1011", "name": "Ethan Miller",     "username": "ethan.m",    "role": "EMPLOYEE",   "teamId": "saga"},
    {"id": "u1012", "name": "Isabella Garcia",  "username": "isabella.g", "role": "EMPLOYEE",   "teamId": "saga"},
    {"id": "u1013", "name": "Christopher Lee",  "username": "chris.l",    "role": "TEAM_LEAD",  "teamId": "vimond"},
    {"id": "u1014", "name": "Ava Anderson",     "username": "ava.a",      "role": "EMPLOYEE",   "teamId": "vimond"},
    {"id": "u1015", "name": "Matthew Taylor",   "username": "matthew.t",  "role": "EMPLOYEE",   "teamId": "vimond"},
    {"id": "u1016", "name": "Mia Thomas",       "username": "mia.t",      "role": "EMPLOYEE",   "teamId": "vimond"},
    {"id": "u1017", "name": "Joshua Jackson",   "username": "joshua.j",   "role": "EMPLOYEE",   "teamId": "vimond"},
    {"id": "u1018", "name": "Charlotte White",  "username": "charlotte.w","role": "EMPLOYEE",   "teamId": "vimond"},
    {"id": "u1019", "name": "Andrew Harris",    "username": "andrew.h",   "role": "EMPLOYEE",   "teamId": "vimond"},
    {"id": "u1020", "name": "Amelia Martin",    "username": "amelia.m",   "role": "EMPLOYEE",   "teamId": "vimond"},
    {"id": "u1021", "name": "Robert Clark",     "username": "robert.c",   "role": "TEAM_LEAD",  "teamId": "admin-account"},
    {"id": "u1022", "name": "Emma Lewis",       "username": "emma.l",     "role": "EMPLOYEE",   "teamId": "admin-account"},
    {"id": "u1023", "name": "William Walker",   "username": "william.w",  "role": "EMPLOYEE",   "teamId": "admin-account"},
    {"id": "u1024", "name": "Grace Hall",       "username": "grace.h",    "role": "EMPLOYEE",   "teamId": "admin-account"},
    {"id": "u1025", "name": "Benjamin Allen",   "username": "benjamin.a", "role": "EMPLOYEE",   "teamId": "admin-account"},
    {"id": "u1026", "name": "Victoria Young",   "username": "victoria.y", "role": "TEAM_LEAD",  "teamId": "marketing"},
    {"id": "u1027", "name": "Alexander King",   "username": "alex.k",     "role": "EMPLOYEE",   "teamId": "marketing"},
    {"id": "u1028", "name": "Lily Wright",      "username": "lily.w",     "role": "EMPLOYEE",   "teamId": "marketing"},
    {"id": "u1029", "name": "Nathan Scott",     "username": "nathan.s",   "role": "EMPLOYEE",   "teamId": "marketing"},
    {"id": "u1030", "name": "Zoe Green",        "username": "zoe.g",      "role": "EMPLOYEE",   "teamId": "marketing"},
    {"id": "u1031", "name": "Lucas Adams",      "username": "lucas.a",    "role": "EMPLOYEE",   "teamId": "marketing"},
    {"id": "u1032", "name": "Rachel Baker",     "username": "rachel.b",   "role": "LOGISTICS",  "teamId": "logistics"},
    {"id": "u1033", "name": "System Admin",     "username": "admin",      "role": "ADMIN",      "teamId": None},
]

SETTINGS = {
    "PK": "SETTINGS",
    "SK": "CONFIG",
    "cutoffTime": "21:00",
    "offDays": [5, 6],
    "iftarPeriods": [],
    "companyWfhPeriods": [],
    "maxForwardPlanningDays": 14,
    "monthlyWfhAllowance": 5,
}


def seed():
    print(f"Seeding table '{table_name}' in region '{region}'...")

    # Teams
    for team in TEAMS:
        table.put_item(Item={"PK": f"TEAM#{team['id']}", "SK": "PROFILE", **team})
    print(f"  {len(TEAMS)} teams written")

    # Users
    for user in USERS:
        item = {
            "PK": f"USER#{user['id']}",
            "SK": "PROFILE",
            "passwordHash": _HASH,
            **{k: v for k, v in user.items() if v is not None},
        }
        table.put_item(Item=item)
    print(f"  {len(USERS)} users written")

    # Settings
    table.put_item(Item=SETTINGS)
    print("  Settings written")

    print("Done. Default password for all users: password123")


if __name__ == "__main__":
    seed()
