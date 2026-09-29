from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    pass


class NotFoundError(AppError):
    pass


class InvalidReferenceError(AppError):
    pass


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(NotFoundError)
    async def handle_not_found(request: Request, exc: NotFoundError) -> JSONResponse:
        return JSONResponse(status_code=404, content={"code": "not_found", "message": str(exc)})

    @app.exception_handler(InvalidReferenceError)
    async def handle_invalid_reference(request: Request, exc: InvalidReferenceError) -> JSONResponse:
        return JSONResponse(status_code=422, content={"code": "invalid_reference", "message": str(exc)})
