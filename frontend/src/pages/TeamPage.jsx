import { useEffect, useState, useCallback } from 'react'
import useAuthStore from '../stores/authStore'
import useUIStore from '../stores/uiStore'
import * as teamApi from '../api/team'
import * as mealsApi from '../api/meals'
import * as workLocationApi from '../api/workLocation'
import styles from './TeamPage.module.css'

const MEAL_LABELS = {
  LUNCH: 'Lunch', SNACKS: 'Snacks', IFTAR: 'Iftar',
  EVENT_DINNER: 'Event Dinner', OPTIONAL_DINNER: 'Optional Dinner',
}

export default function TeamPage() {
  const { user } = useAuthStore()
  const { getSelectedDate, setSelectedDate, addToast } = useUIStore()
  const selectedDate = getSelectedDate()
  const isAdmin = user?.role === 'ADMIN'

  const [teams, setTeams] = useState([])
  const [selectedTeamId, setSelectedTeamId] = useState(user?.teamId || '')
  const [members, setMembers] = useState([])
  const [availableMeals, setAvailableMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBulk, setShowBulk] = useState(false)

  // Fetch team list for admin dropdown once
  useEffect(() => {
    if (!isAdmin) return
    teamApi.getTeams().then(setTeams).catch(() => {})
  }, [isAdmin])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [participation, mealData] = await Promise.all([
        teamApi.getParticipation(selectedDate),
        mealsApi.getMeals(selectedDate),
      ])
      let filtered = participation
      if (isAdmin && selectedTeamId) {
        filtered = participation.filter((m) => m.teamId === selectedTeamId)
      }
      setMembers(filtered)
      setAvailableMeals(mealData.meals)
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [selectedDate, selectedTeamId, isAdmin, addToast])

  useEffect(() => { load() }, [load])

  async function handleMealToggle(member, mealType) {
    const mealDefault = availableMeals.find((m) => m.type === mealType)?.default ?? 'IN'
    const current = member.meals[mealType] ?? mealDefault
    const newStatus = current === 'IN' ? 'OUT' : 'IN'
    try {
      await mealsApi.override(member.id, mealType, newStatus, selectedDate)
      await load()
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  async function handleLocationToggle(member) {
    const newLoc = member.location === 'WFH' ? 'OFFICE' : 'WFH'
    try {
      await workLocationApi.overrideLocation(member.id, selectedDate, newLoc)
      await load()
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  const mealTypes = availableMeals.map((m) => m.type)

  if (loading) return <div className="page-loading">Loading…</div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{isAdmin ? 'All Teams' : 'My Team'}</h1>
        <div className={styles.controls}>
          {isAdmin && (
            <select
              className="form-select"
              style={{ width: 'auto' }}
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
            >
              <option value="">All teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          <input
            type="date"
            className="form-input"
            style={{ width: 'auto' }}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          {availableMeals.length > 0 && members.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowBulk(true)}>
              Bulk Action
            </button>
          )}
        </div>
      </div>

      {members.length === 0 ? (
        <div className="empty-state">No members found for this date.</div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Location</th>
                  {mealTypes.map((type) => (
                    <th key={type}>{MEAL_LABELS[type] || type}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const isWFH = member.location === 'WFH'
                  return (
                    <tr key={member.id} className={isWFH ? styles.wfhRow : ''}>
                      <td>
                        <div className={styles.memberName}>{member.name}</div>
                        {isAdmin && (
                          <div className={styles.memberMeta}>{member.role}</div>
                        )}
                      </td>
                      <td>
                        <button
                          className={`badge ${isWFH ? 'badge-wfh' : 'badge-office'} ${styles.toggleBadge}`}
                          onClick={() => handleLocationToggle(member)}
                          title="Click to toggle location"
                        >
                          {isWFH ? 'WFH' : 'Office'}
                        </button>
                      </td>
                      {mealTypes.map((type) => {
                        if (isWFH) {
                          return <td key={type} className={styles.wfhCell}>—</td>
                        }
                        const mealDefault = availableMeals.find((m) => m.type === type)?.default ?? 'IN'
                        const status = member.meals[type] ?? mealDefault
                        const isIn = status === 'IN'
                        return (
                          <td key={type}>
                            <button
                              className={`badge ${isIn ? 'badge-in' : 'badge-out'} ${styles.toggleBadge}`}
                              onClick={() => handleMealToggle(member, type)}
                              title="Click to toggle"
                            >
                              {isIn ? 'IN' : 'OUT'}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showBulk && (
        <BulkActionModal
          members={members.filter((m) => m.location !== 'WFH')}
          mealTypes={mealTypes}
          selectedDate={selectedDate}
          onClose={() => setShowBulk(false)}
          onApplied={() => { setShowBulk(false); load() }}
          addToast={addToast}
        />
      )}
    </div>
  )
}

function BulkActionModal({ members, mealTypes, selectedDate, onClose, onApplied, addToast }) {
  const [selectedUserIds, setSelectedUserIds] = useState(members.map((m) => m.id))
  const [selectedMealTypes, setSelectedMealTypes] = useState(mealTypes)
  const [action, setAction] = useState('OUT')
  const [startDate, setStartDate] = useState(selectedDate)
  const [endDate, setEndDate] = useState(selectedDate)
  const [submitting, setSubmitting] = useState(false)

  function toggleUser(id) {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function toggleMeal(type) {
    setSelectedMealTypes((prev) =>
      prev.includes(type) ? prev.filter((x) => x !== type) : [...prev, type]
    )
  }

  async function handleApply() {
    if (!selectedUserIds.length || !selectedMealTypes.length) {
      addToast('Select at least one member and one meal', 'error')
      return
    }
    
    const actionText = action === 'OUT' ? 'opt out' : 'opt in'
    const msg = `${actionText.toUpperCase()} ${selectedUserIds.length} member(s) for ${selectedMealTypes.length} meal(s) from ${startDate} to ${endDate}?`
    if (!confirm(msg)) return
    
    setSubmitting(true)
    try {
      await mealsApi.bulkOverride(selectedUserIds, selectedMealTypes, action, startDate, endDate)
      addToast(`Bulk ${actionText} applied`, 'success')
      onApplied()
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
          <span className="modal-title">Bulk Action</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className={styles.bulkSection}>
          <p className="form-label">Members</p>
          <div className={styles.checkGrid}>
            {members.map((m) => (
              <label key={m.id} className={styles.checkItem}>
                <input
                  type="checkbox"
                  checked={selectedUserIds.includes(m.id)}
                  onChange={() => toggleUser(m.id)}
                />
                {m.name}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.bulkSection}>
          <p className="form-label">Meals</p>
          <div className={styles.checkGrid}>
            {mealTypes.map((type) => (
              <label key={type} className={styles.checkItem}>
                <input
                  type="checkbox"
                  checked={selectedMealTypes.includes(type)}
                  onChange={() => toggleMeal(type)}
                />
                {MEAL_LABELS[type] || type}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.bulkSection}>
          <p className="form-label">Action</p>
          <div className={styles.radioGroup}>
            {['OUT', 'IN'].map((val) => (
              <label key={val} className={styles.checkItem}>
                <input
                  type="radio"
                  name="bulkAction"
                  value={val}
                  checked={action === val}
                  onChange={() => setAction(val)}
                />
                Opt {val === 'IN' ? 'In' : 'Out'}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.bulkSection}>
          <p className="form-label">Date range</p>
          <div className={styles.dateRange}>
            <input type="date" className="form-input" value={startDate}
              onChange={(e) => setStartDate(e.target.value)} />
            <span style={{ color: 'var(--color-text-2)', flexShrink: 0 }}>to</span>
            <input type="date" className="form-input" value={endDate}
              onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleApply} disabled={submitting}>
            {submitting ? 'Applying…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  )
}
