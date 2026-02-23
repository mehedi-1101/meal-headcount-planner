import { useEffect, useState, useCallback } from 'react'
import useAuthStore from '../stores/authStore'
import useUIStore from '../stores/uiStore'
import * as mealsApi from '../api/meals'
import * as workLocationApi from '../api/workLocation'
import * as settingsApi from '../api/settings'
import * as teamApi from '../api/team'
import styles from './DashboardPage.module.css'

const MEAL_LABELS = {
  LUNCH:           'Lunch',
  SNACKS:          'Snacks',
  IFTAR:           'Iftar',
  EVENT_DINNER:    'Event Dinner',
  OPTIONAL_DINNER: 'Optional Dinner',
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
  })
}

function isPastCutoff(selectedDate, cutoffTime) {
  const [h, m] = cutoffTime.split(':').map(Number)
  const [y, mo, d] = selectedDate.split('-').map(Number)
  const cutoff = new Date(y, mo - 1, d - 1, h, m, 0, 0)
  return new Date() > cutoff
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const result = new Date(y, m - 1, d + n)
  return result.toISOString().split('T')[0]
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { getSelectedDate, setSelectedDate, addToast } = useUIStore()
  const selectedDate = getSelectedDate()

  const [meals, setMeals] = useState([])
  const [location, setLocation] = useState('OFFICE')
  const [cutoffTime, setCutoffTime] = useState('22:00')
  const [maxForwardDays, setMaxForwardDays] = useState(null)
  const [teamName, setTeamName] = useState(null)
  const [loading, setLoading] = useState(true)
  const [wfhUsage, setWfhUsage] = useState(null) // { wfhDays, allowance, overLimit }

  const isEmployee = user?.role === 'EMPLOYEE'
  const canEdit = user?.role === 'ADMIN' || user?.role === 'TEAM_LEAD'
  const locked = !canEdit && isPastCutoff(selectedDate, cutoffTime)
  const isWFH = location === 'WFH'

  // Resolve team name once
  useEffect(() => {
    if (!user?.teamId) return
    teamApi.getTeams()
      .then((teams) => {
        const found = teams.find((t) => t.id === user.teamId)
        if (found) setTeamName(found.name)
      })
      .catch(() => {})
  }, [user?.teamId])

  // Fetch settings once — cutoff time + forward planning days
  useEffect(() => {
    settingsApi.getSettings()
      .then((s) => {
        setCutoffTime(s.cutoffTime)
        if (s.maxForwardPlanningDays) setMaxForwardDays(s.maxForwardPlanningDays)
      })
      .catch(() => {})
  }, [])

  // Fetch WFH usage for the month of the selected date
  const selectedMonth = selectedDate.slice(0, 7)
  useEffect(() => {
    workLocationApi.getMonthlyUsage(selectedMonth)
      .then((data) => {
        const me = data.users.find((u) => u.userId === user?.id)
        if (me) setWfhUsage({ wfhDays: me.wfhDays, allowance: data.allowance, overLimit: me.overLimit })
      })
      .catch(() => {})
  }, [user?.id, selectedMonth])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [mealsData, locData] = await Promise.all([
        mealsApi.getMeals(selectedDate),
        workLocationApi.getLocation(selectedDate),
      ])
      setMeals(mealsData.meals)
      setLocation(locData.location)
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [selectedDate, addToast])

  useEffect(() => { load() }, [load])

  async function handleLocationToggle() {
    const newLoc = isWFH ? 'OFFICE' : 'WFH'
    try {
      await workLocationApi.setLocation(selectedDate, newLoc)
      setLocation(newLoc)
      // Refresh WFH usage after a location change
      workLocationApi.getMonthlyUsage(selectedMonth)
        .then((data) => {
          const me = data.users.find((u) => u.userId === user?.id)
          if (me) setWfhUsage({ wfhDays: me.wfhDays, allowance: data.allowance, overLimit: me.overLimit })
        })
        .catch(() => {})
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  async function handleMealToggle(meal) {
    try {
      if (meal.status === 'IN') {
        await mealsApi.optOut(meal.type, selectedDate)
      } else {
        await mealsApi.optIn(meal.type, selectedDate)
      }
      const data = await mealsApi.getMeals(selectedDate)
      setMeals(data.meals)
      addToast(`${MEAL_LABELS[meal.type]} updated`, 'success')
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  const today = getSelectedDate()
  const maxDate = isEmployee && maxForwardDays ? addDays(today, maxForwardDays) : undefined

  if (loading) return <div className="page-loading">Loading…</div>

  return (
    <div className={styles.page}>
      {/* Date row */}
      <div className={styles.dateRow}>
        <div>
          <h1 className="page-title">{formatDate(selectedDate)}</h1>
          {teamName && <p className={styles.teamName}>{teamName}</p>}
        </div>
        <input
          type="date"
          className="form-input"
          style={{ width: 'auto' }}
          value={selectedDate}
          max={maxDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      {/* Cutoff banner */}
      {locked && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          Changes are locked. Cutoff was {cutoffTime} the night before.
        </div>
      )}

      {/* No meals */}
      {meals.length === 0 && (
        <div className="alert alert-muted">
          No meals scheduled — this may be a weekend, holiday, or office closure.
        </div>
      )}

      {meals.length > 0 && (
        <>
          {/* Location card */}
          <div className={`card ${styles.locationCard}`}>
            <div className={styles.locationRow}>
              <div className={styles.locationInfo}>
                <span className={`badge ${isWFH ? 'badge-wfh' : 'badge-office'}`}>
                  {isWFH ? 'WFH' : 'Office'}
                </span>
                <p className={styles.locationHint}>
                  {isWFH
                    ? 'You are not counted for any meals today'
                    : 'You are counted for applicable meals by default'}
                </p>
                {wfhUsage && (
                  <p className={wfhUsage.overLimit ? styles.wfhUsageOver : styles.wfhUsage}>
                    WFH this month: {wfhUsage.wfhDays} / {wfhUsage.allowance}
                    {wfhUsage.overLimit && ' — monthly allowance exceeded'}
                  </p>
                )}
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleLocationToggle}
                disabled={locked}
              >
                Switch to {isWFH ? 'Office' : 'WFH'}
              </button>
            </div>
          </div>

          {/* Meal cards */}
          {isWFH ? (
            <div className="empty-state">
              Working from home — not counted for meals.
            </div>
          ) : (
            <div className={styles.mealGrid}>
              {meals.map((meal) => (
                <MealCard
                  key={meal.type}
                  meal={meal}
                  locked={locked}
                  onToggle={() => handleMealToggle(meal)}
                />
              ))}
            </div>
          )}

          {/* Cutoff note */}
          {!locked && !isWFH && (
            <p className={styles.cutoffNote}>
              Changes lock at {cutoffTime} the night before.
            </p>
          )}
        </>
      )}
    </div>
  )
}

function MealCard({ meal, locked, onToggle }) {
  const isIn = meal.status === 'IN'
  const isDefaultOut = meal.default === 'OUT'
  const label = MEAL_LABELS[meal.type] || meal.type

  const actionLabel = isDefaultOut
    ? (isIn ? 'Remove' : meal.type === 'IFTAR' ? "I'm fasting" : 'Add')
    : (isIn ? 'Opt Out' : 'Opt In')

  return (
    <div className={`card ${styles.mealCard} ${isIn ? styles.cardIn : styles.cardOut}`}>
      <div className={styles.mealTop}>
        <span className={styles.mealLabel}>{label}</span>
        <span className={`badge ${isIn ? 'badge-in' : 'badge-out'}`}>
          {isIn ? 'IN' : 'OUT'}
        </span>
      </div>
      <button
        className={`btn btn-sm ${isIn ? 'btn-secondary' : 'btn-primary'}`}
        onClick={onToggle}
        disabled={locked}
      >
        {actionLabel}
      </button>
    </div>
  )
}
