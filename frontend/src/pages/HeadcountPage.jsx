import { useEffect, useState } from 'react'
import useUIStore from '../stores/uiStore'
import useHeadcountStore from '../stores/headcountStore'
import * as announcementApi from '../api/announcement'
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

export default function HeadcountPage() {
  const { getSelectedDate, setSelectedDate, addToast } = useUIStore()
  const selectedDate = getSelectedDate()
  const { report, loading, error, fetchHeadcount } = useHeadcountStore()
  const [announcement, setAnnouncement] = useState(null)
  const [showAnnouncement, setShowAnnouncement] = useState(false)
  const [loadingAnnouncement, setLoadingAnnouncement] = useState(false)

  useEffect(() => {
    fetchHeadcount(selectedDate)
  }, [selectedDate, fetchHeadcount])

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
