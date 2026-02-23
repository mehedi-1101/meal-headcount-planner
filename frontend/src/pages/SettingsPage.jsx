import { useEffect, useState } from 'react'
import useUIStore from '../stores/uiStore'
import * as settingsApi from '../api/settings'
import styles from './SettingsPage.module.css'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function emptyIftar()    { return { label: '', startDate: '', endDate: '' } }
function emptyWfhPeriod(){ return { reason: '', startDate: '', endDate: '' } }

export default function SettingsPage() {
  const { addToast } = useUIStore()

  const [cutoffTime,            setCutoffTime]            = useState('22:00')
  const [offDays,               setOffDays]               = useState([0, 6])
  const [iftarPeriods,          setIftarPeriods]          = useState([])
  const [companyWfhPeriods,     setCompanyWfhPeriods]     = useState([])
  const [maxForwardPlanningDays,setMaxForwardPlanningDays]= useState(14)
  const [monthlyWfhAllowance,   setMonthlyWfhAllowance]   = useState(5)
  const [loading,               setLoading]               = useState(true)
  const [submitting,            setSubmitting]             = useState(false)

  useEffect(() => {
    settingsApi.getSettings()
      .then((s) => {
        setCutoffTime(s.cutoffTime ?? '22:00')
        setOffDays(s.offDays ?? [0, 6])
        setIftarPeriods(s.iftarPeriods ?? [])
        setCompanyWfhPeriods(s.companyWfhPeriods ?? [])
        setMaxForwardPlanningDays(s.maxForwardPlanningDays ?? 14)
        setMonthlyWfhAllowance(s.monthlyWfhAllowance ?? 5)
      })
      .catch((err) => addToast(err.message, 'error'))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleOffDay(day) {
    setOffDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  // Iftar period helpers
  function addIftar()    { setIftarPeriods((p) => [...p, emptyIftar()]) }
  function removeIftar(i){ setIftarPeriods((p) => p.filter((_, idx) => idx !== i)) }
  function patchIftar(i, field, value) {
    setIftarPeriods((p) => p.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  // Company WFH period helpers
  function addWfh()    { setCompanyWfhPeriods((p) => [...p, emptyWfhPeriod()]) }
  function removeWfh(i){ setCompanyWfhPeriods((p) => p.filter((_, idx) => idx !== i)) }
  function patchWfh(i, field, value) {
    setCompanyWfhPeriods((p) => p.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await settingsApi.updateSettings({
        cutoffTime,
        offDays,
        iftarPeriods,
        companyWfhPeriods,
        maxForwardPlanningDays: Number(maxForwardPlanningDays),
        monthlyWfhAllowance: Number(monthlyWfhAllowance),
      })
      addToast('Settings saved', 'success')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="page-loading">Loading…</div>

  return (
    <div className={styles.page}>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <form onSubmit={handleSave}>

        {/* ── Cutoff time ── */}
        <section className={`card ${styles.section}`}>
          <h2 className={styles.sectionTitle}>Headcount Cutoff</h2>
          <p className={styles.sectionHint}>
            Members can no longer change meal participation after this time the night before.
          </p>
          <div className="form-group" style={{ maxWidth: 200 }}>
            <label className="form-label">Cutoff time</label>
            <input
              type="time"
              className="form-input"
              value={cutoffTime}
              onChange={(e) => setCutoffTime(e.target.value)}
              required
            />
          </div>
        </section>

        {/* ── Planning policy ── */}
        <section className={`card ${styles.section}`}>
          <h2 className={styles.sectionTitle}>Planning Policy</h2>
          <p className={styles.sectionHint}>
            Controls how far ahead employees can plan and the monthly WFH allowance.
          </p>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div className="form-group" style={{ maxWidth: 220 }}>
              <label className="form-label">Forward planning window (days)</label>
              <input
                type="number"
                className="form-input"
                min={1}
                max={60}
                value={maxForwardPlanningDays}
                onChange={(e) => setMaxForwardPlanningDays(e.target.value)}
                required
              />
              <p className={styles.sectionHint} style={{ marginTop: 4 }}>
                Employees can plan meals up to this many days ahead.
              </p>
            </div>
            <div className="form-group" style={{ maxWidth: 220 }}>
              <label className="form-label">Monthly WFH allowance (days)</label>
              <input
                type="number"
                className="form-input"
                min={0}
                max={31}
                value={monthlyWfhAllowance}
                onChange={(e) => setMonthlyWfhAllowance(e.target.value)}
                required
              />
              <p className={styles.sectionHint} style={{ marginTop: 4 }}>
                Employees over this limit are flagged in reports. Not a hard block.
              </p>
            </div>
          </div>
        </section>

        {/* ── Off days ── */}
        <section className={`card ${styles.section}`}>
          <h2 className={styles.sectionTitle}>Office Off Days</h2>
          <p className={styles.sectionHint}>
            No meals are scheduled on these days of the week.
          </p>
          <div className={styles.dayGrid}>
            {DAY_NAMES.map((name, idx) => (
              <label key={idx} className={styles.dayLabel}>
                <input
                  type="checkbox"
                  checked={offDays.includes(idx)}
                  onChange={() => toggleOffDay(idx)}
                />
                {name}
              </label>
            ))}
          </div>
        </section>

        {/* ── Iftar periods ── */}
        <section className={`card ${styles.section}`}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Iftar Periods</h2>
              <p className={styles.sectionHint}>
                Iftar meal is scheduled and fasting toggle is shown during these periods.
              </p>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addIftar}>
              + Add period
            </button>
          </div>

          {iftarPeriods.length === 0 ? (
            <p className={styles.emptyHint}>No Iftar periods configured.</p>
          ) : (
            <div className={styles.periodList}>
              {iftarPeriods.map((period, i) => (
                <div key={i} className={styles.periodRow}>
                  <div className="form-group">
                    <label className="form-label">Label</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Ramadan 2026"
                      value={period.label}
                      onChange={(e) => patchIftar(i, 'label', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={period.startDate}
                      onChange={(e) => patchIftar(i, 'startDate', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={period.endDate}
                      onChange={(e) => patchIftar(i, 'endDate', e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    style={{ alignSelf: 'flex-end', marginBottom: 1 }}
                    onClick={() => removeIftar(i)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Company WFH periods ── */}
        <section className={`card ${styles.section}`}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Company WFH Periods</h2>
              <p className={styles.sectionHint}>
                Everyone defaults to WFH during these periods. Individuals can override to Office.
              </p>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addWfh}>
              + Add period
            </button>
          </div>

          {companyWfhPeriods.length === 0 ? (
            <p className={styles.emptyHint}>No company WFH periods configured.</p>
          ) : (
            <div className={styles.periodList}>
              {companyWfhPeriods.map((period, i) => (
                <div key={i} className={styles.periodRow}>
                  <div className="form-group">
                    <label className="form-label">Reason</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Eid holidays"
                      value={period.reason}
                      onChange={(e) => patchWfh(i, 'reason', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={period.startDate}
                      onChange={(e) => patchWfh(i, 'startDate', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={period.endDate}
                      onChange={(e) => patchWfh(i, 'endDate', e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    style={{ alignSelf: 'flex-end', marginBottom: 1 }}
                    onClick={() => removeWfh(i)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className={styles.saveRow}>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save settings'}
          </button>
        </div>

      </form>
    </div>
  )
}
