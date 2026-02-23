import { useEffect, useState } from 'react'
import useAuthStore from '../stores/authStore'
import useUIStore from '../stores/uiStore'
import useHeadcountStore from '../stores/headcountStore'
import * as announcementApi from '../api/announcement'
import * as headcountApi from '../api/headcount'
import * as reportsApi from '../api/reports'
import styles from './HeadcountPage.module.css'

const MEAL_LABELS = {
  LUNCH: 'Lunch', SNACKS: 'Snacks', IFTAR: 'Iftar',
  EVENT_DINNER: 'Event Dinner', OPTIONAL_DINNER: 'Optional Dinner',
}

const SPECIAL_DAY_LABELS = {
  OFFICE_CLOSED: 'Office Closed',
  GOVT_HOLIDAY:  'Government Holiday',
  CELEBRATION:   'Celebration',
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d + n).toISOString().split('T')[0]
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function HeadcountPage() {
  const { user } = useAuthStore()
  const { getSelectedDate, setSelectedDate, addToast } = useUIStore()
  const selectedDate = getSelectedDate()
  const { report, loading, error, fetchHeadcount } = useHeadcountStore()
  const [announcement, setAnnouncement] = useState(null)
  const [showAnnouncement, setShowAnnouncement] = useState(false)
  const [loadingAnnouncement, setLoadingAnnouncement] = useState(false)

  // Forecast
  const [forecastExpanded, setForecastExpanded] = useState(false)
  const [forecast, setForecast] = useState(null)
  const [forecastLoading, setForecastLoading] = useState(false)
  const [forecastError, setForecastError] = useState(null)

  // WFH overage report
  const isTeamLead = user?.role === 'TEAM_LEAD'
  const isAdmin = user?.role === 'ADMIN'
  const isLogistics = user?.role === 'LOGISTICS'
  const canViewWfhReport = isTeamLead || isAdmin || isLogistics

  const [overage, setOverage] = useState(null)
  const [overageMonth, setOverageMonth] = useState(currentMonth())
  const [overageLoading, setOverageLoading] = useState(false)

  useEffect(() => {
    fetchHeadcount(selectedDate)
  }, [selectedDate, fetchHeadcount])

  // Load forecast when expanded
  useEffect(() => {
    if (!forecastExpanded) return
    const startDate = selectedDate
    const endDate = addDays(selectedDate, 14)
    setForecastLoading(true)
    setForecastError(null)
    headcountApi.getForecast(startDate, endDate)
      .then((data) => setForecast(data))
      .catch((err) => setForecastError(err.message))
      .finally(() => setForecastLoading(false))
  }, [forecastExpanded, selectedDate])

  // Load WFH overage when month changes
  useEffect(() => {
    if (!canViewWfhReport) return
    setOverageLoading(true)
    reportsApi.getWfhOverage(overageMonth)
      .then((data) => setOverage(data))
      .catch(() => setOverage(null))
      .finally(() => setOverageLoading(false))
  }, [overageMonth, canViewWfhReport])

  async function handleGenerateAnnouncement() {
    setLoadingAnnouncement(true)
    try {
      const data = await announcementApi.getAnnouncement(selectedDate)
      setAnnouncement(data.text)
      setShowAnnouncement(true)
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setLoadingAnnouncement(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(announcement)
    addToast('Copied to clipboard!', 'success')
  }

  if (loading) return <div className="page-loading">Loading…</div>
  if (error) return (
    <div className="alert alert-error" style={{ marginTop: 24 }}>{error}</div>
  )
  if (!report) return null

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Headcount</h1>
        <div className={styles.headerRight}>
          <input
            type="date"
            className="form-input"
            style={{ width: 'auto' }}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={handleGenerateAnnouncement}
            disabled={loadingAnnouncement}
          >
            {loadingAnnouncement ? 'Generating…' : 'Generate Announcement'}
          </button>
        </div>
      </div>

      {/* Special day banner */}
      {report.specialDay && (
        <div className="alert alert-info" style={{ marginBottom: 20 }}>
          {SPECIAL_DAY_LABELS[report.specialDay.type] || report.specialDay.type}
          {report.specialDay.note && ` — ${report.specialDay.note}`}
        </div>
      )}

      {/* No meals */}
      {report.meals.length === 0 && (
        <div className="alert alert-muted" style={{ marginBottom: 20 }}>
          No meals scheduled for this date.
        </div>
      )}

      {/* Meal cards */}
      {report.meals.length > 0 && (
        <div className={styles.mealCards}>
          {report.meals.map((meal) => (
            <div key={meal.type} className={`card ${styles.mealCard}`}>
              <span className={styles.mealCount}>{meal.headcount}</span>
              <span className={styles.mealLabel}>{MEAL_LABELS[meal.type] || meal.type}</span>
            </div>
          ))}
        </div>
      )}

      {/* Summary row */}
      <div className={`card ${styles.summaryCard}`}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryNum}>{report.officeCount}</span>
          <span className={styles.summaryLabel}>In Office</span>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryItem}>
          <span className={styles.summaryNum}>{report.wfhCount}</span>
          <span className={styles.summaryLabel}>WFH</span>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryItem}>
          <span className={styles.summaryNum}>{report.totalUsers}</span>
          <span className={styles.summaryLabel}>Total</span>
        </div>
      </div>

      {/* Team breakdown */}
      {report.byTeam?.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <p className="form-label" style={{ marginBottom: 12 }}>By Team</p>
          <div className={styles.teamGrid}>
            {report.byTeam.map((team) => (
              <div key={team.teamId} className={styles.teamRow}>
                <span className={styles.teamName}>{team.name}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className="badge badge-office">{team.officeCount} office</span>
                  <span className="badge badge-wfh">{team.wfhCount} WFH</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Forecast section ── */}
      <div className="card" style={{ marginTop: 20 }}>
        <button
          className={styles.sectionToggle}
          onClick={() => setForecastExpanded((v) => !v)}
        >
          <span>14-day Forecast</span>
          <span className={styles.toggleChevron}>{forecastExpanded ? '▴' : '▾'}</span>
        </button>

        {forecastExpanded && (
          <>
            {forecastLoading && <div className="page-loading" style={{ height: 80 }}>Loading…</div>}
            {forecastError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                <span className="alert alert-error" style={{ flex: 1 }}>Could not load forecast.</span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setForecastExpanded(false) || setTimeout(() => setForecastExpanded(true), 0)}
                >Retry</button>
              </div>
            )}
            {!forecastLoading && !forecastError && forecast && (
              <div className="table-wrap" style={{ marginTop: 16 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Special Day</th>
                      <th>Office</th>
                      <th>WFH</th>
                      {/* Meal columns from first working day */}
                      {forecast.days.find((d) => d.meals.length > 0)?.meals.map((m) => (
                        <th key={m.type}>{MEAL_LABELS[m.type] || m.type}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.days.map((day) => {
                      const isOff = day.meals.length === 0
                      const mealCols = forecast.days.find((d) => d.meals.length > 0)?.meals ?? []
                      return (
                        <tr key={day.date} className={isOff ? styles.offDay : ''}>
                          <td style={{ whiteSpace: 'nowrap' }}>{formatShortDate(day.date)}</td>
                          <td>
                            {day.specialDay
                              ? <span className={styles[`special${day.specialDay.type}`] || styles.specialBadge}>
                                  {SPECIAL_DAY_LABELS[day.specialDay.type] || day.specialDay.type}
                                </span>
                              : <span className={styles.dash}>—</span>}
                          </td>
                          <td>{isOff ? <span className={styles.dash}>—</span> : day.officeCount}</td>
                          <td>{isOff ? <span className={styles.dash}>—</span> : day.wfhCount}</td>
                          {mealCols.map((mc) => {
                            const match = day.meals.find((m) => m.type === mc.type)
                            return (
                              <td key={mc.type}>
                                {match ? match.headcount : <span className={styles.dash}>—</span>}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── WFH Overage Report ── */}
      {canViewWfhReport && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className={styles.overageHeader}>
            <p className="form-label" style={{ margin: 0 }}>WFH Overage Report</p>
            <input
              type="month"
              className="form-input"
              style={{ width: 'auto' }}
              value={overageMonth}
              onChange={(e) => setOverageMonth(e.target.value)}
            />
          </div>

          {overageLoading && <div className="page-loading" style={{ height: 60 }}>Loading…</div>}

          {!overageLoading && overage && (
            <>
              {overage.summary.overLimitCount === 0 ? (
                <p className={styles.overageEmpty}>
                  No employees exceeded the monthly WFH allowance for {overageMonth}.
                </p>
              ) : (
                <>
                  <div className={styles.overageBanner}>
                    <strong>{overage.summary.overLimitCount}</strong> employee{overage.summary.overLimitCount !== 1 ? 's' : ''} over limit
                    &nbsp;·&nbsp;
                    <strong>{overage.summary.totalExtraDays}</strong> extra day{overage.summary.totalExtraDays !== 1 ? 's' : ''} this month
                  </div>
                  <div className="table-wrap" style={{ marginTop: 12 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Team</th>
                          <th>WFH Days</th>
                          <th>Allowance</th>
                          <th>Extra Days</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overage.employees.map((emp) => (
                          <tr key={emp.userId}>
                            <td>{emp.name}</td>
                            <td style={{ color: 'var(--color-text-2)' }}>{emp.teamId}</td>
                            <td>{emp.wfhDays}</td>
                            <td>{overage.allowance}</td>
                            <td style={{ color: 'var(--color-warning)', fontWeight: 600 }}>+{emp.extraDays}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Announcement modal */}
      {showAnnouncement && announcement && (
        <div className="modal-overlay" onClick={() => setShowAnnouncement(false)}>
          <div className="modal" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Announcement Preview</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAnnouncement(false)}>✕</button>
            </div>
            <pre className={styles.announcementText}>{announcement}</pre>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-primary" onClick={handleCopy}>
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
