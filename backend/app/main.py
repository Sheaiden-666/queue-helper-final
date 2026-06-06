from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, Request, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from sqlalchemy.orm import Session
from .database import get_db, Student, SessionLocal
from .qr_generator import generate_qr_code
from .websocket_manager import manager
from pydantic import BaseModel
from typing import List
from datetime import datetime
import os

app = FastAPI()