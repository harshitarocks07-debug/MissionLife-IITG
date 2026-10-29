
import { useEffect, useState } from "react";
import {
  Leaf,
  Zap,
  TrendingDown,
  Trophy,
  Sun,
  ArrowRight,
  CheckCircle2,
  Circle,
  Activity,
  Target,
  Lightbulb,
  LoaderCircle,
  AlertCircle,
  Calculator,
  RefreshCw,
  Database,
  Save,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import {
  calculateFootprint,
  saveEnergyReading,
  getEnergyReadings,
  getEnergySummary,
  getChallenges,
  completeChallenge,
  uncompleteChallenge,
  submitRecommendationFeedback,
  updateRecommendationAction,
  getRecommendationFeedback,
  getRecommendations,
} from "./api";

import "./App.css";

const initialChallenges = [
  {
    id: "switch-off-lights",
    title: "Switch off unused lights",
    description:
      "Save electricity by switching off lights when leaving a room.",
    points: 20,
    category: "Energy",
  },
  {
    id: "use-natural-daylight",
    title: "Use natural daylight",
    description:
      "Open curtains and reduce unnecessary daytime lighting.",
    points: 25,
    category: "Energy",
  },
  {
    id: "reduce-single-use-plastic",
    title: "Reduce single-use plastic",
    description:
      "Carry a reusable bottle or bag instead of single-use plastic.",
    points: 30,
    category: "Waste",
  },
];

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

function formatMonth(month) {
  if (!month) return "";

  const [year, monthNumber] = month.split("-").map(Number);

  return new Date(year, monthNumber - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

function Metric({ icon: Icon, label, value, unit, note, color = "green" }) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${color}`}>
        <Icon size={22} />
      </div>

      <div className="metric-content">
        <p className="metric-label">{label}</p>

        <h2 className="metric-value">
          {value}
          {unit && <span className="metric-unit"> {unit}</span>}
        </h2>

        <p className="metric-note">{note}</p>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, icon: Icon }) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>

      {Icon && (
        <div className="section-header-icon">
          <Icon size={21} />
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [electricity, setElectricity] = useState("186");
  const [footprintResult, setFootprintResult] = useState(null);

  const [readingMonth, setReadingMonth] = useState(getCurrentMonth());
  const [readingKwh, setReadingKwh] = useState("");

  const [readings, setReadings] = useState([]);
  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(false);
  const [savingReading, setSavingReading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const [challenges, setChallenges] = useState(
    initialChallenges.map((challenge) => ({ ...challenge, completed: false }))
  );
  const [savingChallenge, setSavingChallenge] = useState(null);
  const [challengeError, setChallengeError] = useState("");
  const [challengeLoading, setChallengeLoading] = useState(true);

  // Recommendation feedback and action tracking
  const [recommendationFeedback, setRecommendationFeedback] = useState({});
  const [recommendationBusy, setRecommendationBusy] = useState({});
  const [recommendationMessage, setRecommendationMessage] = useState("");
  const [recommendationError, setRecommendationError] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [recommendationsError, setRecommendationsError] = useState("");

  const completedPoints = challenges.reduce(
    (total, challenge) =>
      challenge.completed ? total + challenge.points : total,
    0
  );

  const completedCount = challenges.filter(
    (challenge) => challenge.completed
  ).length;

  // Load challenge completion status and points from FastAPI.
  async function loadChallenges() {
    setChallengeError("");

    try {
      setChallengeLoading(true);
      const data = await getChallenges();
      const savedChallenges = Array.isArray(data.challenges)
        ? data.challenges
        : [];

      const mergedChallenges = initialChallenges.map((challenge) => {
        const saved = savedChallenges.find(
          (item) => item.id === challenge.id
        );

        return {
          ...challenge,
          completed: Boolean(saved?.completed),
          points: saved?.points ?? challenge.points,
        };
      });

      setChallenges(mergedChallenges);
    } catch (err) {
      setChallengeError(
        "Could not load Green Challenges. Check that the backend challenge endpoints are available."
      );
    } finally {
      setChallengeLoading(false);
    }
  }

  // Load historical readings and summary from FastAPI.
  async function loadEnergyData() {
    setLoadingHistory(true);
    setHistoryError("");

    try {
      const [historyData, summaryData] = await Promise.all([
        getEnergyReadings(),
        getEnergySummary(),
      ]);

      const sortedReadings = [...(historyData.readings || [])].sort(
        (a, b) => a.month.localeCompare(b.month)
      );

      setReadings(sortedReadings);
      setSummary(summaryData);
    } catch (err) {
      setHistoryError(
        "Could not load saved energy readings. Check that the backend is running."
      );
    } finally {
      setLoadingHistory(false);
    }
  }

  // Load personalized recommendations generated from saved energy readings.
  async function loadRecommendations() {
    setRecommendationsLoading(true);
    setRecommendationsError("");

    try {
      const data = await getRecommendations();
      setRecommendations(Array.isArray(data.recommendations) ? data.recommendations : []);
    } catch (err) {
      setRecommendationsError(
        err.message || "Could not load personalized recommendations. Check the backend."
      );
    } finally {
      setRecommendationsLoading(false);
    }
  }

  async function loadRecommendationFeedback() {
    try {
      const data = await getRecommendationFeedback();
      const saved = {};
      for (const record of data.feedback || []) {
        // The latest record for a recommendation wins.
        if (!(record.recommendation_id in saved)) {
          saved[record.recommendation_id] = {
            helpful: record.helpful,
            action_completed: Boolean(record.action_completed),
          };
        }
      }
      setRecommendationFeedback(saved);
    } catch (err) {
      setRecommendationError(
        "Could not load saved recommendation feedback. Check that the backend is running."
      );
    }
  }

  useEffect(() => {
    loadEnergyData();
    loadChallenges();
    loadRecommendationFeedback();
    loadRecommendations();
  }, []);

  // Carbon footprint calculator.
  async function handleCalculate(event) {
    event.preventDefault();
    setError("");

    const value = Number(electricity);

    if (!Number.isFinite(value) || value <= 0 || value > 100000) {
      setError(
        "Enter electricity usage greater than 0 and no more than 100,000 kWh."
      );
      setFootprintResult(null);
      return;
    }

    setLoading(true);

    try {
      const result = await calculateFootprint(value);
      setFootprintResult(result);
    } catch (err) {
      setError(err.message || "Unable to calculate your carbon footprint.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRecommendationFeedback(recommendationId, helpful) {
    setRecommendationBusy((previous) => ({ ...previous, [recommendationId]: true }));
    setRecommendationMessage("");
    setRecommendationError("");

    try {
      const result = await submitRecommendationFeedback(recommendationId, helpful);
      setRecommendationFeedback((previous) => ({
        ...previous,
        [recommendationId]: {
          helpful: result.helpful,
          action_completed: Boolean(result.action_completed),
        },
      }));
      setRecommendationMessage("Thanks. Your feedback has been saved.");
    } catch (err) {
      setRecommendationError(err.message || "Could not save recommendation feedback.");
    } finally {
      setRecommendationBusy((previous) => ({ ...previous, [recommendationId]: false }));
    }
  }

  async function handleRecommendationAction(recommendationId, actionCompleted) {
    setRecommendationBusy((previous) => ({ ...previous, [recommendationId]: true }));
    setRecommendationMessage("");
    setRecommendationError("");

    try {
      const result = await updateRecommendationAction(recommendationId, actionCompleted);
      setRecommendationFeedback((previous) => ({
        ...previous,
        [recommendationId]: {
          helpful: previous[recommendationId]?.helpful ?? null,
          action_completed: Boolean(result.action_completed),
        },
      }));
      setRecommendationMessage(
        result.action_completed ? "Action marked as completed." : "Action marked as not completed."
      );
    } catch (err) {
      setRecommendationError(err.message || "Could not update action status.");
    } finally {
      setRecommendationBusy((previous) => ({ ...previous, [recommendationId]: false }));
    }
  }

  // Save or update a monthly reading in SQLite.
  async function handleSaveReading(event) {
    event.preventDefault();
    setSaveMessage("");
    setHistoryError("");

    const value = Number(readingKwh);

    if (!readingMonth) {
      setHistoryError("Select a month.");
      return;
    }

    if (!Number.isFinite(value) || value <= 0 || value > 100000) {
      setHistoryError(
        "Enter electricity usage greater than 0 and no more than 100,000 kWh."
      );
      return;
    }

    setSavingReading(true);

    try {
      const result = await saveEnergyReading(readingMonth, value);

      await loadEnergyData();
      await loadRecommendations();

      setSaveMessage(
        `${result.month} reading saved successfully: ${result.electricity_kwh} kWh.`
      );

      setReadingKwh("");
    } catch (err) {
      setHistoryError(
        err.message || "Unable to save the reading. Check the backend."
      );
    } finally {
      setSavingReading(false);
    }
  }

  function resetCalculator() {
    setElectricity("186");
    setFootprintResult(null);
    setError("");
  }

  async function toggleChallenge(challenge) {
    if (savingChallenge !== null || challengeLoading) return;

    setSavingChallenge(challenge.id);
    setChallengeError("");

    const previousCompleted = challenge.completed;

    setChallenges((previous) =>
      previous.map((item) =>
        item.id === challenge.id
          ? { ...item, completed: !previousCompleted }
          : item
      )
    );

    try {
      if (previousCompleted) {
        await uncompleteChallenge(challenge.id);
      } else {
        await completeChallenge(challenge.id);
      }

      await loadChallenges();
    } catch (err) {
      setChallenges((previous) =>
        previous.map((item) =>
          item.id === challenge.id
            ? { ...item, completed: previousCompleted }
            : item
        )
      );

      setChallengeError(
        err.message || "Unable to update this challenge. Please try again."
      );
    } finally {
      setSavingChallenge(null);
    }
  }

  // The chart uses all historical readings.
  const chartData = readings.map((reading) => ({
    month: formatMonth(reading.month),
    electricity: Number(reading.electricity_kwh),
    emissions: Number(reading.carbon_footprint_kg),
  }));

  // The history table displays only the five most recent months.
  const latestFiveReadings = [...readings]
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 5);

  const latestReading = readings.length
    ? readings[readings.length - 1]
    : null;

  const latestKwh = latestReading
    ? Number(latestReading.electricity_kwh)
    : null;

  const latestEmissions = latestReading
    ? Number(latestReading.carbon_footprint_kg)
    : null;

  const reduction = summary?.footprint_reduction_percent;

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Leaf size={25} />
          </div>

          <div>
            <h1>MissionLiFE</h1>
            <span>IMPACT DASHBOARD</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-heading">WORKSPACE</p>

          <a href="#overview" className="nav-link active">
            <Activity size={19} />
            <span>Overview</span>
          </a>

          <a href="#footprint" className="nav-link">
            <Leaf size={19} />
            <span>Carbon Footprint</span>
          </a>

          <a href="#energy-tracker" className="nav-link">
            <Zap size={19} />
            <span>Energy Tracker</span>
          </a>

          <a href="#recommendations" className="nav-link">
            <Lightbulb size={19} />
            <span>Recommendations</span>
          </a>

          <a href="#challenges" className="nav-link">
            <Trophy size={19} />
            <span>Green Challenges</span>
          </a>

          <p className="nav-heading nav-heading-spaced">YOUR IMPACT</p>

          <div className="sidebar-impact">
            <div className="sidebar-impact-icon">
              <Target size={20} />
            </div>

            <div>
              <strong>
                {completedCount} / {challenges.length}
              </strong>
              <span>Challenges completed</span>
            </div>
          </div>

          <div className="sidebar-points">
            <span>Points earned this session</span>
            <strong>{completedPoints}</strong>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="footer-leaf">
            <Leaf size={18} />
          </div>

          <p>
            Small actions.
            <br />
            <strong>Meaningful impact.</strong>
          </p>
        </div>
      </aside>

      {/* Main dashboard */}
      <main className="main-content" id="overview">
        <header className="topbar">
          <div>
            <p className="eyebrow">SUSTAINABILITY WORKSPACE</p>
            <h1>Your environmental impact</h1>
            <p className="topbar-subtitle">
              Track your energy usage and build greener daily habits.
            </p>
          </div>

          <div className="status-pill">
            <span className="status-dot" />
            API-connected dashboard
          </div>
        </header>

        {/* Metric cards */}
        <section className="metrics-grid" aria-label="Impact metrics">
          <Metric
            icon={Leaf}
            label="Latest monthly emissions"
            value={
              latestEmissions !== null
                ? latestEmissions.toLocaleString("en-IN")
                : "—"
            }
            unit="kg CO₂"
            note={
              latestReading
                ? `Saved reading: ${latestReading.month}`
                : "Save an energy reading below"
            }
            color="green"
          />

          <Metric
            icon={Zap}
            label="Latest electricity usage"
            value={
              latestKwh !== null ? latestKwh.toLocaleString("en-IN") : "—"
            }
            unit="kWh"
            note={
              latestReading
                ? `Month: ${latestReading.month}`
                : "No saved readings yet"
            }
            color="yellow"
          />

          <Metric
            icon={TrendingDown}
            label="Footprint reduction"
            value={
              reduction !== null && reduction !== undefined
                ? `${reduction}%`
                : "—"
            }
            unit=""
            note={
              summary?.reading_count >= 2
                ? "Earliest vs latest saved reading"
                : "Save at least two monthly readings"
            }
            color="blue"
          />

          <Metric
            icon={Trophy}
            label="Green challenge points"
            value={completedPoints.toString()}
            unit="pts"
            note={`${completedCount} challenge${
              completedCount === 1 ? "" : "s"
            } completed this session`}
            color="purple"
          />
        </section>

        {/* Calculator and chart */}
        <section className="dashboard-grid">
          <div className="panel calculator-panel" id="footprint">
            <SectionHeader
              title="Carbon footprint calculator"
              subtitle="Estimate emissions from your monthly electricity consumption."
              icon={Calculator}
            />

            <form className="calculator-form" onSubmit={handleCalculate}>
              <label htmlFor="electricity">
                Monthly electricity consumption
              </label>

              <div className="input-with-unit">
                <input
                  id="electricity"
                  type="number"
                  min="0.01"
                  max="100000"
                  step="any"
                  value={electricity}
                  onChange={(event) => setElectricity(event.target.value)}
                  placeholder="e.g. 186"
                  required
                />

                <span>kWh / month</span>
              </div>

              <div className="calculator-hint">
                <Lightbulb size={16} />
                Find your monthly usage on your electricity bill.
              </div>

              <div className="calculator-actions">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <LoaderCircle className="spin" size={18} />
                      Calculating...
                    </>
                  ) : (
                    <>
                      Calculate footprint
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={resetCalculator}
                  disabled={loading}
                  aria-label="Reset calculator"
                >
                  <RefreshCw size={17} />
                </button>
              </div>
            </form>

            {error && (
              <div className="error-message" role="alert">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {footprintResult && (
              <div className="calculation-result" aria-live="polite">
                <div className="result-topline">
                  <CheckCircle2 size={19} />
                  <span>Calculation complete</span>
                </div>

                <div className="result-number">
                  {footprintResult.estimated_monthly_emissions_kg_co2.toLocaleString(
                    "en-IN"
                  )}
                  <span>kg CO₂ / month</span>
                </div>

                <p className="result-detail">
                  Based on {footprintResult.monthly_electricity_kwh} kWh of
                  monthly electricity usage.
                </p>

                <p className="result-factor">
                  Emission factor used:{" "}
                  {footprintResult.emission_factor_kg_co2_per_kwh} kg CO₂/kWh
                </p>

                {footprintResult.note && (
                  <p className="result-disclaimer">{footprintResult.note}</p>
                )}

                {footprintResult.recommendations?.length > 0 && (
                  <div className="recommendations">
                    <h3>Recommended actions</h3>

                    {recommendationMessage && (
                      <div className="result-topline" role="status" style={{ marginBottom: 10 }}>
                        <CheckCircle2 size={17} />
                        <span>{recommendationMessage}</span>
                      </div>
                    )}
                    {recommendationError && (
                      <div className="error-message" role="alert" style={{ marginBottom: 10 }}>
                        <AlertCircle size={17} />
                        <span>{recommendationError}</span>
                        <button type="button" className="secondary-button" onClick={loadRecommendationFeedback}>
                          Retry
                        </button>
                      </div>
                    )}
                    <ul>
                      {footprintResult.recommendations.map((item, index) => {
                        const recommendationId = `footprint-${index}`;
                        const saved = recommendationFeedback[recommendationId];
                        const busy = Boolean(recommendationBusy[recommendationId]);
                        return (
                          <li key={`${index}-${item}`} style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
                            <CheckCircle2 size={16} />
                            <div style={{ flex: "1 1 240px" }}>
                              <span>{item}</span>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                                <button type="button" className="secondary-button" disabled={busy} aria-pressed={saved?.helpful === true} onClick={() => handleRecommendationFeedback(recommendationId, true)}>
                                  Helpful
                                </button>
                                <button type="button" className="secondary-button" disabled={busy} aria-pressed={saved?.helpful === false} onClick={() => handleRecommendationFeedback(recommendationId, false)}>
                                  Not helpful
                                </button>
                                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                                  <input type="checkbox" checked={Boolean(saved?.action_completed)} disabled={busy} onChange={(event) => handleRecommendationAction(recommendationId, event.target.checked)} />
                                  Mark action completed
                                </label>
                              </div>
                              {saved?.helpful === true && <small>Feedback: helpful</small>}
                              {saved?.helpful === false && <small>Feedback: not helpful</small>}
                              {saved?.action_completed && <small style={{ display: "block" }}>Action completed</small>}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chart: all saved readings */}
          <div className="panel chart-panel" id="energy">
            <SectionHeader
              title="Monthly energy history"
              subtitle="Historical electricity consumption from saved readings."
              icon={Zap}
            />

            {loadingHistory ? (
              <div className="empty-state">
                <LoaderCircle className="spin" size={25} />
                <p>Loading saved readings...</p>
              </div>
            ) : historyError && readings.length === 0 ? (
              <div className="empty-state error-state">
                <AlertCircle size={25} />
                <p>{historyError}</p>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={loadEnergyData}
                >
                  <RefreshCw size={16} />
                  Retry
                </button>
              </div>
            ) : readings.length === 0 ? (
              <div className="empty-state">
                <Database size={30} />
                <h3>No saved readings yet</h3>
                <p>Save a monthly reading to populate this chart.</p>
              </div>
            ) : (
              <>
                <div className="chart-summary">
                  <div>
                    <span className="chart-summary-label">
                      Latest monthly usage
                    </span>

                    <strong>{latestKwh.toLocaleString("en-IN")} kWh</strong>
                  </div>

                  <span className="chart-badge">
                    {readings.length}{" "}
                    {readings.length === 1 ? "reading" : "readings"}
                  </span>
                </div>

                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{
                        top: 12,
                        right: 8,
                        left: -18,
                        bottom: 0,
                      }}
                    >
                      <defs>
                        <linearGradient
                          id="energyGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#28a66a"
                            stopOpacity={0.25}
                          />
                          <stop
                            offset="100%"
                            stopColor="#28a66a"
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e9eee9"
                      />

                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#7c887f", fontSize: 11 }}
                        dy={8}
                      />

                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#7c887f", fontSize: 11 }}
                        tickFormatter={(value) => `${value}`}
                      />

                      <Tooltip
                        formatter={(value) => [`${value} kWh`, "Electricity"]}
                        contentStyle={{
                          borderRadius: "10px",
                          border: "1px solid #e4ebe5",
                        }}
                      />

                      <Area
                        type="monotone"
                        dataKey="electricity"
                        stroke="#28a66a"
                        strokeWidth={3}
                        fill="url(#energyGradient)"
                        activeDot={{ r: 5, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-footnote">
                  <span className="chart-legend-dot" />
                  <span>Saved monthly electricity readings</span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Energy Tracker */}
        <section className="panel challenges-panel" id="energy-tracker">
          <SectionHeader
            title="Energy Tracker"
            subtitle="Save and review monthly electricity consumption."
            icon={Database}
          />

          <form className="calculator-form" onSubmit={handleSaveReading}>
            <label htmlFor="reading-month">Reading month</label>

            <div className="input-with-unit">
              <input
                id="reading-month"
                type="month"
                value={readingMonth}
                onChange={(event) => setReadingMonth(event.target.value)}
                required
              />
            </div>

            <label htmlFor="reading-kwh">Electricity consumed</label>

            <div className="input-with-unit">
              <input
                id="reading-kwh"
                type="number"
                min="0.01"
                max="100000"
                step="any"
                value={readingKwh}
                onChange={(event) => setReadingKwh(event.target.value)}
                placeholder="Enter kWh from your electricity bill"
                required
              />

              <span>kWh</span>
            </div>

            <div className="calculator-hint">
              <Lightbulb size={16} />
              Saving an existing month updates that month's reading.
            </div>

            <div className="calculator-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={savingReading}
              >
                {savingReading ? (
                  <>
                    <LoaderCircle className="spin" size={18} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={17} />
                    Save energy reading
                  </>
                )}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={loadEnergyData}
                disabled={loadingHistory || savingReading}
                aria-label="Refresh energy history"
              >
                <RefreshCw size={17} />
              </button>
            </div>
          </form>

          {saveMessage && (
            <div
              className="result-topline"
              role="status"
              style={{ marginTop: 16 }}
            >
              <CheckCircle2 size={18} />
              <span>{saveMessage}</span>
            </div>
          )}

          {historyError && (
            <div className="error-message" role="alert">
              <AlertCircle size={18} />
              <span>{historyError}</span>
            </div>
          )}

          <div style={{ marginTop: 25 }}>
            <h3 style={{ fontSize: 14, marginBottom: 12 }}>
              Latest 5 monthly readings
            </h3>

            {loadingHistory && readings.length === 0 ? (
              <p className="challenge-disclaimer">Loading reading history...</p>
            ) : latestFiveReadings.length === 0 ? (
              <p className="challenge-disclaimer">
                No readings have been saved yet.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                    textAlign: "left",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={tableHeaderStyle}>Month</th>
                      <th style={tableHeaderStyle}>Electricity</th>
                      <th style={tableHeaderStyle}>Estimated emissions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {latestFiveReadings.map((reading) => (
                      <tr key={reading.id}>
                        <td style={tableCellStyle}>{reading.month}</td>
                        <td style={tableCellStyle}>
                          {Number(reading.electricity_kwh).toLocaleString(
                            "en-IN"
                          )}{" "}
                          kWh
                        </td>
                        <td style={tableCellStyle}>
                          {Number(reading.carbon_footprint_kg).toLocaleString(
                            "en-IN",
                            { maximumFractionDigits: 2 }
                          )}{" "}
                          kg CO₂
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {summary && (
            <p className="challenge-disclaimer">{summary.message}</p>
          )}
        </section>

        {/* Personalized recommendations: generated from saved energy data */}
        <section className="panel challenges-panel" id="recommendations">
          <SectionHeader
            title="Personalized energy insights"
            subtitle="Recommendations based on your saved monthly electricity readings—not repeatable challenges."
            icon={Lightbulb}
          />

          {recommendationMessage && (
            <div className="result-topline" role="status" style={{ marginBottom: 12 }}>
              <CheckCircle2 size={17} />
              <span>{recommendationMessage}</span>
            </div>
          )}

          {recommendationError && (
            <div className="error-message" role="alert" style={{ marginBottom: 12 }}>
              <AlertCircle size={17} />
              <span>{recommendationError}</span>
              <button type="button" className="secondary-button" onClick={loadRecommendationFeedback}>Retry feedback</button>
            </div>
          )}

          {recommendationsError && (
            <div className="error-message" role="alert" style={{ marginBottom: 12 }}>
              <AlertCircle size={17} />
              <span>{recommendationsError}</span>
              <button type="button" className="secondary-button" onClick={loadRecommendations} disabled={recommendationsLoading}>Retry recommendations</button>
            </div>
          )}

          {recommendationsLoading ? (
            <div className="empty-state">
              <LoaderCircle className="spin" size={24} />
              <p>Analyzing your saved energy readings...</p>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="empty-state">
              <Lightbulb size={28} />
              <h3>No recommendations available</h3>
              <p>Save a monthly energy reading to generate personalized insights.</p>
              <button type="button" className="secondary-button" onClick={loadRecommendations}>Refresh insights</button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 16 }}>
              {recommendations.map((item) => {
                const recommendationId = item.id;
                const saved = recommendationFeedback[recommendationId];
                const busy = Boolean(recommendationBusy[recommendationId]);
                const priority = (item.priority || "medium").toLowerCase();

                return (
                  <article key={recommendationId} style={{ border: "1px solid #e2ebe4", borderRadius: 14, padding: 20, background: "#fff", display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#208653", marginBottom: 7 }}>
                          {item.category || "Energy insight"}
                        </span>
                        <h3 style={{ margin: 0, fontSize: 18, lineHeight: 1.35, color: "#20372b" }}>{item.title}</h3>
                      </div>
                      <span style={{ flexShrink: 0, borderRadius: 999, padding: "5px 9px", fontSize: 11, fontWeight: 700, textTransform: "capitalize", color: priority === "high" ? "#a33b32" : priority === "medium" ? "#946200" : "#28734a", background: priority === "high" ? "#fff0ee" : priority === "medium" ? "#fff6df" : "#eaf6ee" }}>
                        {priority} priority
                      </span>
                    </div>

                    <p style={{ margin: 0, lineHeight: 1.65, color: "#58675e", fontSize: 14 }}>{item.description}</p>

                    {item.reason && (
                      <div style={{ borderLeft: "3px solid #b9dfc6", padding: "8px 10px", background: "#f5faf6", borderRadius: "0 8px 8px 0" }}>
                        <strong style={{ display: "block", fontSize: 11, textTransform: "uppercase", color: "#54705d", marginBottom: 4 }}>Why this appears</strong>
                        <p style={{ margin: 0, color: "#5c6d62", fontSize: 12, lineHeight: 1.5 }}>{item.reason}</p>
                      </div>
                    )}

                    {(item.current_value_kwh != null || item.target_value_kwh != null) && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {item.current_value_kwh != null && <span style={{ padding: "7px 9px", borderRadius: 8, background: "#f3f6f3", fontSize: 12, color: "#435349" }}>Current: <strong>{item.current_value_kwh} kWh</strong></span>}
                        {item.target_value_kwh != null && <span style={{ padding: "7px 9px", borderRadius: 8, background: "#eaf6ee", fontSize: 12, color: "#24764a" }}>Target: <strong>{item.target_value_kwh} kWh</strong></span>}
                      </div>
                    )}

                    <div style={{ borderTop: "1px solid #edf1ed", paddingTop: 12, marginTop: "auto" }}>
                      <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#637168", textTransform: "uppercase" }}>Was this insight useful?</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <button type="button" className="secondary-button" disabled={busy} aria-pressed={saved?.helpful === true} onClick={() => handleRecommendationFeedback(recommendationId, true)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "auto", minWidth: 104, minHeight: 40, padding: "10px 16px", whiteSpace: "nowrap", wordBreak: "normal", overflowWrap: "normal", flexShrink: 0, lineHeight: 1.2, borderRadius: 9, borderColor: saved?.helpful === true ? "#278653" : undefined, background: saved?.helpful === true ? "#e7f5eb" : undefined }}>Helpful</button>
                        <button type="button" className="secondary-button" disabled={busy} aria-pressed={saved?.helpful === false} onClick={() => handleRecommendationFeedback(recommendationId, false)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "auto", minWidth: 104, minHeight: 40, padding: "10px 16px", whiteSpace: "nowrap", wordBreak: "normal", overflowWrap: "normal", flexShrink: 0, lineHeight: 1.2, borderRadius: 9, borderColor: saved?.helpful === false ? "#278653" : undefined, background: saved?.helpful === false ? "#e7f5eb" : undefined }}>Not helpful</button>
                      </div>
                    </div>

                    <label style={{ display: "flex", alignItems: "center", gap: 9, padding: 11, borderRadius: 9, border: "1px solid #e2ebe4", background: saved?.action_completed ? "#eef8f0" : "#f7f9f7", fontSize: 13, fontWeight: 600, color: "#385344", cursor: busy ? "wait" : "pointer" }}>
                      <input type="checkbox" checked={Boolean(saved?.action_completed)} disabled={busy} onChange={(event) => handleRecommendationAction(recommendationId, event.target.checked)} />
                      {saved?.action_completed ? "Action marked completed" : "Mark action as completed"}
                    </label>
                  </article>
                );
              })}
            </div>
          )}

          <p className="challenge-disclaimer" style={{ marginTop: 16 }}>
            Insights are generated from saved energy readings. A completed action records your report; energy savings should be verified against later readings.
          </p>
        </section>

        {/* Green challenges */}
        <section className="panel challenges-panel" id="challenges">
          <SectionHeader
            title="Green challenges"
            subtitle="Complete sustainability actions to earn points."
            icon={Trophy}
          />

          <div className="challenge-progress">
            <div className="challenge-progress-copy">
              <span>Your session progress</span>

              <strong>
                {completedCount} of {challenges.length} completed
              </strong>
            </div>

            <div
              className="progress-track"
              role="progressbar"
              aria-valuenow={completedCount}
              aria-valuemin={0}
              aria-valuemax={challenges.length}
              aria-label="Green challenges completed"
            >
              <div
                className="progress-fill"
                style={{
                  width: `${
                    (challenges.length ? completedCount / challenges.length : 0) * 100
                  }%`,
                }}
              />
            </div>
          </div>

          {challengeError && (
            <div className="error-message" role="alert">
              <AlertCircle size={18} />
              <span>{challengeError}</span>
              <button
                type="button"
                className="secondary-button"
                onClick={loadChallenges}
                disabled={challengeLoading}
              >
                <RefreshCw size={16} />
                Retry
              </button>
            </div>
          )}

          {challengeLoading ? (
            <div className="empty-state">
              <LoaderCircle className="spin" size={24} />
              <p>Loading Green Challenges...</p>
            </div>
          ) : (
          <div className="challenges-list">
            {challenges.map((challenge) => {
              const completed = challenge.completed;

              return (
                <div
                  key={challenge.id}
                  className={`challenge-card ${
                    completed ? "completed" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="challenge-check"
                    onClick={() => toggleChallenge(challenge)}
                    disabled={savingChallenge !== null || challengeLoading}
                    aria-label={
                      completed
                        ? `Mark ${challenge.title} incomplete`
                        : `Complete ${challenge.title}`
                    }
                    aria-pressed={completed}
                  >
                    {completed ? (
                      <CheckCircle2 size={24} />
                    ) : (
                      <Circle size={24} />
                    )}
                  </button>

                  <div className="challenge-details">
                    <div className="challenge-title-row">
                      <h3>{challenge.title}</h3>
                      <span className="challenge-category">
                        {challenge.category}
                      </span>
                    </div>

                    <p>{challenge.description}</p>
                  </div>

                  <div className="challenge-points">
                    <strong>{challenge.points}</strong>
                    <span>points</span>
                  </div>
                </div>
              );
            })}
          </div>
          )}

          <p className="challenge-disclaimer">
            Completed challenges and points are saved in the backend database.
          </p>
        </section>

        {/* Clean energy banner */}
        <section className="solar-banner">
          <div className="solar-icon">
            <Sun size={30} />
          </div>

          <div className="solar-content">
            <p className="eyebrow">EXPLORE CLEAN ENERGY</p>
            <h2>Make your energy use more sustainable</h2>
            <p>
              Consider energy-efficient appliances, rooftop solar feasibility,
              and everyday electricity-saving habits.
            </p>
          </div>

          <a href="#energy-tracker" className="solar-action">
            Track usage
            <ArrowRight size={18} />
          </a>
        </section>

        <footer className="dashboard-footer">
          <span>MissionLiFE-Impact</span>
          <span>Built to encourage sustainable everyday choices</span>
        </footer>
      </main>
    </div>
  );
}

const tableHeaderStyle = {
  padding: "12px 10px",
  color: "#758279",
  borderBottom: "1px solid #e4ebe5",
  fontWeight: 600,
};

const tableCellStyle = {
  padding: "13px 10px",
  color: "#435349",
  borderBottom: "1px solid #edf1ed",
};
