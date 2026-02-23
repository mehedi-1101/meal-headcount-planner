import { useEffect, useState, useCallback, useRef, forwardRef } from 'react'
import useAuthStore from '../stores/authStore'
import useUIStore from '../stores/uiStore'
import useAuditStore from '../stores/auditStore'
import * as teamApi from '../api/team'
import * as mealsApi from '../api/meals'
import * as workLocationApi from '../api/workLocation'
import styles from './TeamPage.module.css'

const MEAL_LABELS = {
  LUNCH: 'Lunch', SNACKS: 'Snacks', IFTAR: 'Iftar',
  EVENT_DINNER: 'Event Dinner', OPTIONAL_DINNER: 'Optional Dinner',
}

function formatAuditTime(isoString) {
  return new Date(isoString).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatActionType(actionType, details) {
  switch (actionType) {
    case 'MEAL_OPT_OUT':      return `Opted out of ${details.mealType}`
    case 'MEAL_OPT_IN':       return `Opted in to ${details.mealType}`
    case 'MEAL_OVERRIDE':     return `Override: ${details.mealType} → ${details.status}`
    case 'LOCATION_CHANGE':   return `Set location to ${details.location}`
    case 'LOCATION_OVERRIDE': return `Override location to ${details.location}`
    case 'BULK_OVERRIDE':     return `Bulk override (${details.status})`
    default: return actionType
  }
}

export default function TeamPage() {
  const { user } = useAuthStore()
  const { getSelectedDate, setSelectedDate, addToast } = useUIStore()
  const selectedDate = getSelectedDate()
  const isAdmin = user?.role === 'ADMIN'
  const isLogistics = user?.role === 'LOGISTICS'
  const canViewAudit = !isLogistics

  const [teams, setTeams] = useState([])
  const [selectedTeamId, setSelectedTeamId] = useState(user?.teamId || '')
  const [members, setMembers] = useState([])
  const [availableMeals, setAvailableMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showBulk, setShowBulk] = useState(false)

  // WFH usage per member
  const [wfhUsageMap, setWfhUsageMap] = useState({})
  const [showOverLimitOnly, setShowOverLimitOnly] = useState(false)

  // Audit popover: { memberId, mealType }
  const [openPopover, setOpenPopover] = useState(null)
  const popoverRef = useRef(null)

  const fetchEntries = useAuditStore((s) => s.fetchEntries)
  const getEntries = useAuditStore((s) => s.getEntries)
  const isLoadingAudit = useAuditStore((s) => s.isLoading)
  const invalidateAudit = useAuditStore((s) => s.invalidate)

  useEffect(() => {
    if (!isAdmin) return
    teamApi.getTeams().then(setTeams).catch(() => {})
  }, [isAdmin])

  const selectedMonth = selectedDate.slice(0, 7)
  const loadWfhUsage = useCallback(() => {
    workLocationApi.getMonthlyUsage(selectedMonth)
      .then((data) => {
        const map = {}
        data.users.forEach((u) => {
          map[u.userId] = { wfhDays: u.wfhDays, allowance: data.allowance, overLimit: u.overLimit }
        })
        setWfhUsageMap(map)
      })
      .catch(() => {})
  }, [selectedMonth])

  useEffect(() => { loadWfhUsage() }, [loadWfhUsage])

  const load = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true)
    else setRefreshing(true)
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
      setRefreshing(false)
    }
  }, [selectedDate, selectedTeamId, isAdmin, addToast])

  useEffect(() => { load(members.length === 0) }, [load]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close popover on outside click / Escape
  useEffect(() => {
    if (!openPopover) return
    function onKey(e) { if (e.key === 'Escape') setOpenPopover(null) }
    function onMouse(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpenPopover(null)
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onMouse)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onMouse)
    }
  }, [openPopover])

  async function handleMealToggle(member, mealType) {
    const mealDefault = availableMeals.find((m) => m.type === mealType)?.default ?? 'IN'
    const current = member.meals[mealType] ?? mealDefault
    const newStatus = current === 'IN' ? 'OUT' : 'IN'
    // Optimistic update
    setMembers((prev) => prev.map((m) =>
      m.id === member.id ? { ...m, meals: { ...m.meals, [mealType]: newStatus } } : m
    ))
    try {
      await mealsApi.override(member.id, mealType, newStatus, selectedDate)
      invalidateAudit(member.id, selectedDate)
    } catch (err) {
      addToast(err.message, 'error')
      load(false) // revert on failure
    }
  }

  async function handleLocationToggle(member) {
    const newLoc = member.location === 'WFH' ? 'OFFICE' : 'WFH'
    // Optimistic update
    setMembers((prev) => prev.map((m) =>
      m.id === member.id ? { ...m, location: newLoc } : m
    ))
    try {
      await workLocationApi.overrideLocation(member.id, selectedDate, newLoc)
      invalidateAudit(member.id, selectedDate)
      loadWfhUsage()
    } catch (err) {
      addToast(err.message, 'error')
      load(false) // revert on failure
    }
  }

  function handleAuditClick(memberId, mealType, e) {
    e.stopPropagation()
    if (openPopover?.memberId === memberId && openPopover?.mealType === mealType) {
      setOpenPopover(null)
      return
    }
    setOpenPopover({ memberId, mealType })
    fetchEntries(memberId, selectedDate)
  }

  const mealTypes = availableMeals.map((m) => m.type)
  const overLimitCount = Object.values(wfhUsageMap).filter((u) => u.overLimit).length
  const displayedMembers = showOverLimitOnly
    ? members.filter((m) => wfhUsageMap[m.id]?.overLimit)
    : members

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

      {/* Over-limit filter */}
      {Object.keys(wfhUsageMap).length > 0 && (
        <div className={styles.filterBar}>
          <button
            className={`btn btn-sm ${showOverLimitOnly ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowOverLimitOnly((v) => !v)}
          >
            Over WFH limit
            {overLimitCount > 0 && (
              <span className={styles.filterCount}>{overLimitCount}</span>
            )}
          </button>
        </div>
      )}

      {displayedMembers.length === 0 ? (
        <div className="empty-state">
          {showOverLimitOnly
            ? 'No members have exceeded the WFH limit.'
            : 'No members found for this date.'}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, opacity: refreshing ? 0.6 : 1, transition: 'opacity 0.15s ease', pointerEvents: refreshing ? 'none' : 'auto' }}>
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
                {displayedMembers.map((member) => {
                  const isWFH = member.location === 'WFH'
                  const usage = wfhUsageMap[member.id]
                  return (
                    <tr key={member.id} className={isWFH ? styles.wfhRow : ''}>
                      <td>
                        <div className={styles.memberName}>{member.name}</div>
                        {isAdmin && (
                          <div className={styles.memberMeta}>{member.role}</div>
                        )}
                        {usage && (
                          <div className={usage.overLimit ? styles.wfhBadgeOver : styles.wfhBadge}>
                            WFH {usage.wfhDays}/{usage.allowance}
                          </div>
                        )}
                      </td>
                      <td style={{ position: 'relative' }}>
                        <div className={styles.mealCell}>
                          <button
                            className={`badge ${isWFH ? 'badge-wfh' : 'badge-office'} ${styles.toggleBadge}`}
                            onClick={() => handleLocationToggle(member)}
                            title="Click to toggle location"
                          >
                            {isWFH ? 'WFH' : 'Office'}
                          </button>
                          {canViewAudit && (
                            <button
                              className={styles.historyBtn}
                              onClick={(e) => handleAuditClick(member.id, null, e)}
                              onMouseEnter={() => fetchEntries(member.id, selectedDate)}
                              title="View change history"
                            >
                              ⏱
                            </button>
                          )}
                        </div>
                        {openPopover?.memberId === member.id && openPopover?.mealType === null && (
                          <AuditPopover
                            ref={popoverRef}
                            memberId={member.id}
                            date={selectedDate}
                            getEntries={getEntries}
                            isLoading={isLoadingAudit}
                          />
                        )}
                      </td>
                      {mealTypes.map((type) => {
                        if (isWFH) {
                          return <td key={type} className={styles.wfhCell}>—</td>
                        }
                        const mealDefault = availableMeals.find((m) => m.type === type)?.default ?? 'IN'
                        const status = member.meals[type] ?? mealDefault
                        const isIn = status === 'IN'
                        const isOpen = openPopover?.memberId === member.id && openPopover?.mealType === type
                        return (
                          <td key={type} style={{ position: 'relative' }}>
                            <div className={styles.mealCell}>
                              <button
                                className={`badge ${isIn ? 'badge-in' : 'badge-out'} ${styles.toggleBadge}`}
                                onClick={() => handleMealToggle(member, type)}
                                title="Click to toggle"
                              >
                                {isIn ? 'IN' : 'OUT'}
                              </button>
                              {canViewAudit && (
                                <button
                                  className={styles.historyBtn}
                                  onClick={(e) => handleAuditClick(member.id, type, e)}
                                  onMouseEnter={() => fetchEntries(member.id, selectedDate)}
                                  title="View change history"
                                >
                                  ⏱
                                </button>
                              )}
                            </div>
                            {isOpen && (
                              <AuditPopover
                                ref={popoverRef}
                                memberId={member.id}
                                date={selectedDate}
                                getEntries={getEntries}
                                isLoading={isLoadingAudit}
                              />
                            )}
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
          onApplied={() => { setShowBulk(false); load(false) }}
          addToast={addToast}
        />
      )}
    </div>
  )
}

const AuditPopover = forwardRef(function AuditPopover({ memberId, date, getEntries, isLoading }, ref) {
  const loading = isLoading(memberId, date)
  const entries = getEntries(memberId, date)

  return (
    <div ref={ref} className={styles.popover}>
      <p className={styles.popoverTitle}>Change history</p>
      {loading && <p className={styles.popoverMuted}>Loading…</p>}
      {!loading && (!entries || entries.length === 0) && (
        <p className={styles.popoverMuted}>No changes recorded.</p>
      )}
      {!loading && entries && entries.length > 0 && (
        <ul className={styles.auditList}>
          {[...entries].reverse().map((e) => (
            <li key={e.id} className={styles.auditEntry}>
              <span className={styles.auditActor}>{e.actorName}</span>
              <span className={styles.auditAction}>{formatActionType(e.actionType, e.details)}</span>
              <span className={styles.auditTime}>{formatAuditTime(e.timestamp)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
})

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
