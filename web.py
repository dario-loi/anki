from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel
from typing import List, Optional
import jsonlines
import random
import os
from datetime import datetime
import math
from fastapi.templating import Jinja2Templates
from pathlib import Path

class Card(BaseModel):
    front: str
    back: str
    id: Optional[int] = None

class DeckState(BaseModel):
    current_index: int
    is_front: bool
    cards_remaining: int

app = FastAPI()

# Set up templates and static directories
BASE_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

class DeckManager:
    def __init__(self, deck_file: str):
        self.deck_file = deck_file
        self.cards = self.load_deck()
        self.current_index = 0
        self.is_front = True

    def load_deck(self) -> List[Card]:
        cards = []
        with jsonlines.open(self.deck_file) as reader:
            for idx, obj in enumerate(reader):
                card = Card(**obj, id=idx)
                cards.append(card)
        random.shuffle(cards)
        return cards

    def get_current_card(self) -> Card:
        return self.cards[self.current_index]

    def next_card(self) -> Card:
        self.current_index = (self.current_index + 1) % len(self.cards)
        if self.current_index == 0:
            random.shuffle(self.cards)
        self.is_front = True
        return self.get_current_card()

    def prev_card(self) -> Card:
        self.current_index = max(0, self.current_index - 1)
        self.is_front = True
        return self.get_current_card()

    def flip_card(self) -> Card:
        self.is_front = not self.is_front
        return self.get_current_card()

    def get_state(self) -> DeckState:
        return DeckState(
            current_index=self.current_index,
            is_front=self.is_front,
            cards_remaining=len(self.cards) - self.current_index - 1
        )


class DeckList(BaseModel):
    name: str
    path: str

# Add to FastAPI app
DECKS_DIR = BASE_DIR / "decks"
deck_managers = {}

def get_available_decks() -> List[DeckList]:
    decks = []
    for file in DECKS_DIR.glob("*.jsonl"):
        decks.append(DeckList(
            name=file.stem,
            path=str(file.relative_to(BASE_DIR))
        ))
    return decks


# Initialize deck manager
deck_manager = DeckManager(DECKS_DIR / "bigdata.jsonl")

@app.get("/api/decks")
async def list_decks():
    return get_available_decks()

@app.post("/api/deck/select/{deck_name}")
async def select_deck(deck_name: str):
    decks = get_available_decks()
    deck_path = next((d.path for d in decks if d.name == deck_name), None)
    if not deck_path:
        raise HTTPException(404, "Deck not found")

    global deck_manager
    deck_manager = DeckManager(DECKS_DIR / f"{deck_name}.jsonl")
    return {"status": "success"}

@app.get("/", response_class=HTMLResponse)
async def root():
    return FileResponse("templates/index.html")

@app.get("/api/card/current")
async def get_current_card():
    return deck_manager.get_current_card()

@app.get("/api/card/next")
async def next_card():
    return deck_manager.next_card()

@app.get("/api/card/previous")
async def previous_card():
    return deck_manager.prev_card()

@app.get("/api/card/flip")
async def flip_card():
    return deck_manager.flip_card()

@app.get("/api/state")
async def get_state():
    return deck_manager.get_state()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
