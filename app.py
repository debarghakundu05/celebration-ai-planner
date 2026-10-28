from datetime import date
from pathlib import Path

from flask import Flask, jsonify, request, send_file

app = Flask(__name__)

EVENTS = {
    "Birthday": {
        "budget": {
            "Food & drinks": 0.42,
            "Decor": 0.20,
            "Photography": 0.12,
            "Venue & activities": 0.16,
            "Contingency": 0.10,
        },
        "minimum_per_guest": 700,
        "ideas": [
            "Set up a simple cake-and-photo moment instead of decorating every area.",
            "Choose one shared activity, such as a music playlist or party games.",
        ],
        "vendors": ["Cake baker", "Small-event decorator", "Photographer"],
    },
    "Wedding": {
        "budget": {
            "Food & drinks": 0.35,
            "Decor": 0.28,
            "Photography": 0.14,
            "Venue & logistics": 0.15,
            "Contingency": 0.08,
        },
        "minimum_per_guest": 2500,
        "ideas": [
            "Prioritize the ceremony backdrop and reuse its flowers for the reception.",
            "Ask venues for an itemized package quote before booking outside vendors.",
        ],
        "vendors": ["Venue coordinator", "Caterer", "Florist or decorator", "Photographer"],
    },
    "Community Fest": {
        "budget": {
            "Food & drinks": 0.28,
            "Decor & signage": 0.20,
            "Photography": 0.10,
            "Venue, sound & permits": 0.30,
            "Contingency": 0.12,
        },
        "minimum_per_guest": 500,
        "ideas": [
            "Invite local groups to host activity stalls and share setup costs.",
            "Keep a clear sound schedule and a weather backup for outdoor activities.",
        ],
        "vendors": ["Venue or grounds contact", "Sound supplier", "Food-stall operators"],
    },
    "Corporate Party": {
        "budget": {
            "Food & drinks": 0.38,
            "Decor & AV": 0.18,
            "Photography": 0.15,
            "Venue & logistics": 0.20,
            "Contingency": 0.09,
        },
        "minimum_per_guest": 1200,
        "ideas": [
            "Keep speeches and awards short, with a timed run-of-show.",
            "Use a simple branded welcome or photo area instead of extensive decor.",
        ],
        "vendors": ["Venue coordinator", "Caterer", "AV technician", "Photographer"],
    },
}


def allocate_budget(event_type, budget):
    percentages = EVENTS[event_type]["budget"]
    names = list(percentages)
    amounts = {
        name: int(budget * percentages[name])
        for name in names[:-1]
    }
    amounts[names[-1]] = budget - sum(amounts.values())
    return amounts


def parse_whole_number(value):
    if isinstance(value, bool):
        raise ValueError
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.isdecimal():
        return int(value)
    raise ValueError


def create_plan(event_type, theme, budget, guests, location, event_date):
    details = EVENTS[event_type]
    days_left = (event_date - date.today()).days
    amount_per_guest = round(budget / guests)
    if days_left > 30:
        next_steps = [
            "Confirm your guest list and shortlist venues.",
            "Request itemized quotes from the key vendors.",
            "Book the venue and the vendors with limited availability.",
        ]
    elif days_left > 7:
        next_steps = [
            "Confirm vendor bookings, guest count, and any dietary needs.",
            "Finalize the event schedule and transport or setup details.",
            "Keep the contingency amount available for last-minute changes.",
        ]
    else:
        next_steps = [
            "Reconfirm arrival times, final guest count, and vendor contacts.",
            "Prepare a simple event-day schedule and payment checklist.",
            "Avoid adding nonessential purchases at the last minute.",
        ]

    return {
        "event_type": event_type,
        "theme": theme,
        "location": location,
        "event_date": event_date.isoformat(),
        "guests": guests,
        "total_budget": budget,
        "amount_per_guest": amount_per_guest,
        "days_left": days_left,
        "budget": allocate_budget(event_type, budget),
        "ideas": details["ideas"],
        "vendors": details["vendors"],
        "next_steps": next_steps,
        "budget_note": (
            "This is a tight starting budget for this event type; consider "
            "simplifying the venue or decor, or adjusting the guest count."
            if amount_per_guest < details["minimum_per_guest"]
            else "This budget is a planning estimate; compare local quotes before booking."
        ),
    }


@app.route("/")
def home():
    return send_file(Path(__file__).with_name("index.html"))


@app.route("/api/generate", methods=["POST"])
def generate():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Please submit event details as JSON."}), 400

    event_type = data.get("type")
    theme = data.get("theme")
    location = data.get("location")
    if event_type not in EVENTS:
        return jsonify({"error": "Choose a valid event type."}), 400
    if not isinstance(theme, str) or not theme.strip():
        return jsonify({"error": "Choose a theme."}), 400
    if not isinstance(location, str) or not location.strip():
        return jsonify({"error": "Enter a city or event location."}), 400

    try:
        budget = parse_whole_number(data.get("budget"))
        guests = parse_whole_number(data.get("guests"))
        event_date = date.fromisoformat(data.get("date", ""))
    except (TypeError, ValueError):
        return jsonify({"error": "Enter a whole-rupee budget, guest count, and valid event date."}), 400

    if budget <= 0 or guests <= 0:
        return jsonify({"error": "Budget and guest count must be greater than zero."}), 400
    if event_date < date.today():
        return jsonify({"error": "Choose today or a future date for your event."}), 400

    return jsonify(
        create_plan(
            event_type,
            theme.strip(),
            budget,
            guests,
            location.strip(),
            event_date,
        )
    )


if __name__ == "__main__":
    app.run(debug=True)
