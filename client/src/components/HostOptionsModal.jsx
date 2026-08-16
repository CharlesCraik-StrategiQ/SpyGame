import { useState } from 'react';
import { useSocket } from '../SocketContext';

export default function HostOptionsModal({ roomCode, settings, onClose }) {
  const socket = useSocket();
  const [timerEnabled, setTimerEnabled] = useState(settings?.timerEnabled ?? false);
  const [timerMinutes, setTimerMinutes] = useState(settings?.timerMinutes ?? 5);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    const minutes = Math.max(1, Math.min(60, Math.round(Number(timerMinutes)) || 5));
    socket.emit('update_host_settings', {
      code: roomCode,
      timerEnabled,
      timerMinutes: minutes
    }, (response) => {
      setSaving(false);
      if (!response.success) {
        alert(response.error);
        return;
      }
      onClose();
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="terminal-header">HOST OPTIONS</div>
        <div className="terminal-box">
          <div className="section">
            <div className="setting-row">
              <label className="setting-label" htmlFor="timer-toggle">
                Enable Round Timer
              </label>
              <button
                id="timer-toggle"
                type="button"
                role="switch"
                aria-checked={timerEnabled}
                className={`toggle-switch ${timerEnabled ? 'on' : ''}`}
                onClick={() => setTimerEnabled(!timerEnabled)}
              >
                <span className="toggle-knob" />
              </button>
            </div>

            {timerEnabled && (
              <div className="setting-row setting-row-input">
                <label className="setting-label" htmlFor="timer-minutes">
                  Time Limit (minutes)
                </label>
                <input
                  id="timer-minutes"
                  type="number"
                  min={1}
                  max={60}
                  value={timerMinutes}
                  onChange={(e) => setTimerMinutes(e.target.value)}
                  className="input timer-minutes-input"
                />
              </div>
            )}

            <div className="info">
              When the timer expires, everyone must nominate who they think the spy is.
              Players can still call a vote mid-round.
            </div>
          </div>

          <div className="btn-group">
            <button className="btn" onClick={handleSave} disabled={saving}>
              {saving ? 'SAVING...' : 'SAVE'}
            </button>
            <button className="btn btn-secondary" onClick={onClose}>
              CANCEL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
