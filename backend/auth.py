from fastapi import Header, Query

LOCAL_USER = "local_user"


def get_user_id(authorization: str = Header(None)) -> str:
    return LOCAL_USER


def get_user_id_optional(authorization: str = Header(None)) -> str | None:
    return LOCAL_USER


def get_user_id_from_token_param(token: str = Query(None)) -> str:
    return LOCAL_USER
