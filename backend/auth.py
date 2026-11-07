"""
Local branch: no accounts and no Supabase. Everything belongs to one local user,
so these return the same id the hosted version would get from a verified login.
"""
from fastapi import Header, Query

LOCAL_USER = "local_user"


def get_user_id(authorization: str = Header(None)) -> str:
    return LOCAL_USER


def get_user_id_optional(authorization: str = Header(None)) -> str | None:
    return LOCAL_USER


def get_user_id_from_token_param(token: str = Query(None)) -> str:
    return LOCAL_USER
