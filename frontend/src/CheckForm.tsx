import { useState, useEffect } from 'react'
import type { Vehicle, CheckItem, CheckItemKey, ErrorResponse } from './types'
import { api } from './api'
import { ToastContainer } from './Toast'
import { useToast } from './useToast'

const CHECK_ITEMS: CheckItemKey[] = ['TYRES', 'BRAKES', 'LIGHTS', 'OIL', 'COOLANT']

const CHARS_LIMIT = 300

interface Props {
  onSuccess: () => void
  // TODO: Add showToast prop to display toast notifications
}

export function CheckForm({ onSuccess }: Props) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState('')
  const [odometerKm, setOdometerKm] = useState('')
  const [items, setItems] = useState<CheckItem[]>(CHECK_ITEMS.map((key) => ({ key, status: 'OK' as const })))
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const { toasts, showToast, dismissToast } = useToast()

  useEffect(() => {
    api.getVehicles().then(setVehicles).catch(console.error)
  }, [])

  const handleItemStatusChange = (key: CheckItemKey, status: 'OK' | 'FAIL') => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, status } : item)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setValidationErrors([])
    setLoading(true)

    try {
      // TODO: Include note in the API request
      await api.createCheck({
        vehicleId: selectedVehicle,
        odometerKm: parseFloat(odometerKm),
        items,
        ...(note.trim() && { note: note.trim() })
      })

      // Reset form and display success notification
      setSelectedVehicle('')
      setOdometerKm('')
      setItems(CHECK_ITEMS.map((key) => ({ key, status: 'OK' as const })))
      setNote('')
      showToast('Check submitted successfully!', 'success')
      onSuccess()
    } catch (err: unknown) {
      const errorResponse = err as ErrorResponse
      // TODO: Show error toast notification if got error
      if (errorResponse.error?.details) {
        const errorMessages = errorResponse.error.details.map((d) => `${d.field}: ${d.reason}`)
        setValidationErrors(errorMessages)
        showToast('Validation failed. Please check the form.', 'error')
      } else {
        const errorMsg = 'Failed to submit check. Please try again.'
        setError(errorMsg)
        showToast(errorMsg, 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const remainingChars = CHARS_LIMIT - note.length

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <form onSubmit={handleSubmit} className="check-form">
        <h2>Submit Vehicle Inspection Result</h2>

        {error && <div className="error-banner">{error}</div>}
        {validationErrors.length > 0 && (
          <div className="error-banner">
            <strong>Validation errors:</strong>
            <ul>
              {validationErrors.map((err, i) => (
                <li key={`submit-vehicle-errors-${i}`}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="vehicle">Vehicle *</label>
          <select id="vehicle" value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)} required>
            <option value="">Select a vehicle</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registration} - {v.make} {v.model} ({v.year})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="odometer">Odometer (km) *</label>
          <input id="odometer" type="number" value={odometerKm} onChange={(e) => setOdometerKm(e.target.value)} placeholder="Enter odometer reading" min="0" step="0.1" required />
        </div>

        <div className="form-group">
          <label>Checklist Items *</label>
          <div className="checklist">
            {items.map((item) => (
              <div key={item.key} className="checklist-item">
                <span className="item-label">{item.key}</span>
                <div className="radio-group">
                  <label>
                    <input type="radio" name={item.key} checked={item.status === 'OK'} onChange={() => handleItemStatusChange(item.key, 'OK')} />
                    OK
                  </label>
                  <label>
                    <input type="radio" name={item.key} checked={item.status === 'FAIL'} onChange={() => handleItemStatusChange(item.key, 'FAIL')} />
                    FAIL
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TODO: Add a notes textarea field here (optional, max 300 characters) */}
        <div className="form-group">
          <label htmlFor="note">
            Notes <span className="optional-label">(Optional)</span>
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add any additional notes about the inspection..."
            maxLength={CHARS_LIMIT}
            rows={4}
          ></textarea>
          <div className="character-counter">{remainingChars} characters remaining</div>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Check'}
        </button>
      </form>
    </>
  )
}
