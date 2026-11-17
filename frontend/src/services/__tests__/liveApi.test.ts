import { describe, it, expect } from 'vitest';
import { parseLiveTickEvent } from '../liveApi';
import type { LiveRaceTick } from '../../types/live';

describe('liveApi SSE parser', () => {
  it('parses live tick data correctly', () => {
    const rawData = JSON.stringify({
      session_key: 11412,
      polled_at: '2026-11-08T17:42:15Z',
      delay_seconds: 3.4,
      stale: false,
      source: 'replay',
      safety_car_status: 'NONE',
      leader_lap: 35,
      drivers: [
        {
          position: 1,
          driver_number: 1,
          driver_code: 'VER',
          team_name: 'Red Bull Racing',
          interval_to_ahead: 0.0,
          gap_to_leader: 0.0,
          last_lap_time: 73.412,
          current_stint: 2,
          tyre_compound: 'HARD',
          tyre_age: 15,
          pit_stops: 1,
          in_pit: false,
          coordinates: [-452.1, 120.4],
        },
      ],
    });

    const parsed: LiveRaceTick = parseLiveTickEvent(rawData);
    expect(parsed.session_key).toBe(11412);
    expect(parsed.safety_car_status).toBe('NONE');
    expect(parsed.leader_lap).toBe(35);
    expect(parsed.drivers).toHaveLength(1);
    expect(parsed.drivers[0].driver_code).toBe('VER');
    expect(parsed.drivers[0].coordinates).toEqual([-452.1, 120.4]);
  });

  it('handles invalid json safely without throwing', () => {
    expect(() => parseLiveTickEvent('invalid-json')).toThrowError();
  });
});
