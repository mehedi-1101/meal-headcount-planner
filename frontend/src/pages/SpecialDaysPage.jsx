import { useEffect, useState } from 'react'
import useUIStore from '../stores/uiStore'
import * as specialDaysApi from '../api/specialDays'
import styles from './SpecialDaysPage.module.css'

const TYPE_LABELS = {
  OFFICE_CLOSED: 'Office Closed',
  GOVT_HOLIDAY:  'Government Holiday',
  CELEBRATION:   'Celebration',
}

const TYPE_BADGE = {
  OFFICE_CLOSED: 'badge-out',
  GOVT_HOLIDAY:  'badge-wfh',
  CELEBRATION:   'badge-office',
}

const EXTRA_MEALS = ['EVENT_DINNER', 'OPTIONAL_DINNER']
const MEAL_LABELS = { EVENT_DINNER: 'Event Dinner', OPTIONAL_DINNER: 'Optional Dinner' }

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

export default function SpecialDaysPage() {
  const { addToast } = useUIStore()
  const [days, setDays] = useState([])
  const [month, setMonth] = useState(currentMonth())
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editDay, setEditDay] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const data = await specialDaysApi.getSpecialDays(month)
      data.sort((a, b) => a.date.localeCompare(b.date))
      setDays(data)
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [month]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(date) {
    if (!confirm(`Delete special day for ${date}?`)) return
    try {
      await specialDaysApi.deleteSpecialDay(date)
      addToast('Deleted', 'success')
      load()
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  if (loading) return <div className="page-loading">Loading…</div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Special Days</h1>
        <div className={styles.controls}>
          <input
            type="month"
            className="form-input"
            style={{ width: 'auto' }}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <button className="btn btn-primary btn-sm" onClick={() => { setEditDay(null); setShowForm(true) }}>
            + Add
          </button>
        </div>
      </div>

      {days.length === 0 ? (
        <div className="empty-state">No special days for {month}.</div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Note</th>
                  <th>Extra Meals</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day.date}>
                    <td><span className={styles.dateCell}>{day.date}</span></td>
                    <td>
                      <span className={`badge ${TYPE_BADGE[day.type] || 'badge-wfh'}`}>
                        {TYPE_LABELS[day.type] || day.type}
                      </span>
                    </td>
                    <td className={styles.noteCell}>{day.note || '—'}</td>
                    <td className={styles.noteCell}>
                      {day.meals?.length > 0
                        ? day.meals.map((m) => MEAL_LABELS[m] || m).join(', ')
                        : '—'}
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button className="btn btn-ghost btn-sm"
                          onClick={() => { setEditDay(day); setShowForm(true) }}>
                          Edit
                        </button>
                        <button className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(day.date)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <SpecialDayModal
          day={editDay}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load() }}
          addToast={addToast}
        />
      )}
    </div>
  )
}

function SpecialDayModal({ day, onClose, onSaved, addToast }) {
  const isEdit = !!day
  const [date, setDate]   = useState(day?.date || '')
  const [type, setType]   = useState(day?.type || 'GOVT_HOLIDAY')
  const [note, setNote]   = useState(day?.note || '')
  const [meals, setMeals] = useState(day?.meals || [])
  const [submitting, setSubmitting] = useState(false)

  function toggleMeal(meal) {
    setMeals((prev) =>
      prev.includes(meal) ? prev.filter((m) => m !== meal) : [...prev, meal]
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = { date, type, note: note || undefined, meals }
      if (isEdit) {
        await specialDaysApi.updateSpecialDay(day.date, payload)
      } else {
        await specialDaysApi.createSpecialDay(payload)
      }
      addToast(isEdit ? 'Updated' : 'Created', 'success')
      onSaved()
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{isEdit ? 'Edit Special Day' : 'Add Special Day'}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              type="date" className="form-input"
              value={date} onChange={(e) => setDate(e.target.value)}
              required disabled={isEdit}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
              {Object.entries(TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <input
              type="text" className="form-input"
              value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Shab-e-Meraj"
            />
          </div>

          {type === 'CELEBRATION' && (
            <div className="form-group">
              <label className="form-label">Extra meals</label>
              <div style={{ display: 'flex', gap: 20, marginTop: 4 }}>
                {EXTRA_MEALS.map((meal) => (
                  <label key={meal} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <input type="checkbox" checked={meals.includes(meal)} onChange={() => toggleMeal(meal)} />
                    {MEAL_LABELS[meal]}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : (isEdit ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
