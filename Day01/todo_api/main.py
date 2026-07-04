from itertools import count
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel


app = FastAPI(title="Simple TODO API")
index_path = Path(__file__).with_name("index.html")


class TodoCreate(BaseModel):
    title: str


class TodoUpdate(BaseModel):
    completed: Optional[bool] = None


class Todo(BaseModel):
    id: int
    title: str
    completed: bool


# 메모리에 할 일을 저장합니다.
# 서버를 껐다 켜면 데이터는 사라집니다.
todos: list[Todo] = []
next_id = count(1)


def find_todo(todo_id: int) -> Todo:
    for todo in todos:
        if todo.id == todo_id:
            return todo
    raise HTTPException(status_code=404, detail="할 일을 찾을 수 없습니다.")


@app.get("/")
def root():
    return HTMLResponse(index_path.read_text(encoding="utf-8"))


@app.get("/todos", response_model=list[Todo])
def get_todos():
    return todos


@app.post("/todos", response_model=Todo, status_code=201)
def create_todo(todo: TodoCreate):
    new_todo = Todo(
        id=next(next_id),
        title=todo.title.strip(),
        completed=False,
    )

    if not new_todo.title:
        raise HTTPException(status_code=400, detail="할 일 제목은 비워둘 수 없습니다.")

    todos.append(new_todo)
    return new_todo


@app.patch("/todos/{todo_id}", response_model=Todo)
def update_todo(todo_id: int, todo_update: TodoUpdate):
    todo = find_todo(todo_id)

    if todo_update.completed is not None:
        todo.completed = todo_update.completed

    return todo


@app.delete("/todos/{todo_id}", status_code=204)
def delete_todo(todo_id: int):
    todo = find_todo(todo_id)
    todos.remove(todo)
