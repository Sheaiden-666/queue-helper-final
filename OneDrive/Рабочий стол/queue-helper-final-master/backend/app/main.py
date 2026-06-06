from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from .database import get_db, Student
from .qr_generator import generate_qr_code
from .websocket_manager import manager
from pydantic import BaseModel
from typing import List
from datetime import datetime

app = FastAPI()

# Монтируем статику из папки app/static
app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.get("/")
async def root():
    return FileResponse("app/static/index.html")

@app.get("/student")
async def student_page():
    return FileResponse("app/static/student.html")

@app.get("/teacher")
async def teacher_page():
    return FileResponse("app/static/teacher.html")

# ---------- Модели ----------
class StudentCreate(BaseModel):
    name: str
    group: str

class StudentOut(BaseModel):
    id: int
    name: str
    group: str
    created_at: datetime
    position: int

def get_queue_with_positions(db: Session):
    students = db.query(Student).order_by(Student.created_at).all()
    result = []
    for idx, s in enumerate(students, start=1):
        result.append(StudentOut(
            id=s.id,
            name=s.name,
            group=s.group,
            created_at=s.created_at,
            position=idx
        ))
    return result

# ---------- API ----------
@app.get("/api/queue", response_model=List[StudentOut])
async def get_queue(db: Session = Depends(get_db)):
    return get_queue_with_positions(db)

@app.post("/api/queue/add")
async def add_student(student: StudentCreate, db: Session = Depends(get_db)):
    new_student = Student(name=student.name, group=student.group)
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    await manager.broadcast("update")
    return {"status": "ok", "id": new_student.id}

@app.delete("/api/queue/{student_id}")
async def remove_student(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Студент не найден")
    db.delete(student)
    db.commit()
    await manager.broadcast("update")
    return {"status": "ok"}

@app.post("/api/queue/call-next")
async def call_next(db: Session = Depends(get_db)):
    first = db.query(Student).order_by(Student.created_at).first()
    if not first:
        raise HTTPException(status_code=404, detail="Очередь пуста")
    db.delete(first)
    db.commit()
    await manager.broadcast("update")
    return {"status": "ok", "called": first.name}

@app.get("/api/qr/student")
async def qr_for_student():
    # QR ведёт на страницу регистрации студента
    return generate_qr_code("http://127.0.0.1:8000/student")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)