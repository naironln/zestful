from collections import defaultdict
from datetime import datetime, timezone

from app.models.alcohol import AlcoholEntryOut, AlcoholDaySummary


def _alcohol_record_to_out(record: dict) -> AlcoholEntryOut:
    consumed_at = record["consumed_at"]
    logged_at = record["logged_at"]

    if hasattr(consumed_at, "to_native"):
        consumed_at = consumed_at.to_native()
    if hasattr(logged_at, "to_native"):
        logged_at = logged_at.to_native()

    # Ensure timezone-aware
    if isinstance(consumed_at, datetime) and consumed_at.tzinfo is None:
        consumed_at = consumed_at.replace(tzinfo=timezone.utc)
    if isinstance(logged_at, datetime) and logged_at.tzinfo is None:
        logged_at = logged_at.replace(tzinfo=timezone.utc)

    return AlcoholEntryOut(
        id=record["id"],
        doses=record["doses"],
        notes=record.get("notes"),
        consumed_at=consumed_at,
        logged_at=logged_at,
    )


def group_into_day_summaries(records: list[dict]) -> list[AlcoholDaySummary]:
    grouped: dict[str, list[AlcoholEntryOut]] = defaultdict(list)
    for record in records:
        date_key = record.get("_date", "")
        entry = _alcohol_record_to_out(record)
        grouped[date_key].append(entry)

    summaries = []
    for date, entries in grouped.items():
        summaries.append(
            AlcoholDaySummary(
                date=date,
                total_doses=sum(e.doses for e in entries),
                entries=entries,
            )
        )

    # Sort descending by date
    summaries.sort(key=lambda s: s.date, reverse=True)
    return summaries
