from fastapi import Query


def pagination_params(
    skip: int = Query(default=0, ge=0, description="Number of records to skip"),
    limit: int = Query(default=20, ge=1, le=100, description="Max records to return"),
) -> dict:
    return {"skip": skip, "limit": limit}
