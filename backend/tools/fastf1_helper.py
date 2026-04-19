import fastf1
import pandas as pd
import os
from typing import Optional

# Setup caching for FastF1
# Ensure the backend/data directory exists
CACHE_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR)

fastf1.Cache.enable_cache(CACHE_DIR)

def get_session_telemetry(year: int, event: str, session_type: str, driver: str):
    """
    Fetches telemetry data for a specific driver in a session.
    Example: 2023, 'Japanese Grand Prix', 'R', 'HAM'
    """
    session = fastf1.get_session(year, event, session_type)
    session.load()
    
    # Get best lap of the driver
    laps = session.laps.pick_driver(driver)
    if laps.empty:
        return None
    
    fastest_lap = laps.pick_fastest()
    telemetry = fastest_lap.get_telemetry()
    
    return telemetry

if __name__ == "__main__":
    # Test script: Fetch Hamilton's telemetry from 2023 Japan GP
    print("Fetching Lewis Hamilton's telemetry from 2023 Japanese GP...")
    data = get_session_telemetry(2023, 'Japanese Grand Prix', 'R', 'HAM')
    if data is not None:
        print(f"Successfully fetched {len(data)} data points.")
        print(data.head())
    else:
        print("Could not fetch data.")
