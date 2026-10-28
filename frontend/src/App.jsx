
import { useState } from "react";
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
import { calculateFootprint } from "./api";
import "./App.css";

// Sample chart data. Historical tracking is not connected yet.
const weeklyData = [
  { day: "Mon", energy: 6.2 },
  { day: "Tue", energy: 5.8 },
  { day: "Wed", energy: 7.1 },
  { day: "Thu", energy: 5.4 },
  { day: "Fri", energy: 6.5 },
  { day: "Sat", energy: 4.9 },
  { day: "Sun", energy: 5.2 },
];

const initialChallenges = [
  {
    id: 1,
    title: "Switch off unused lights",
    description: "Save electricity by switching off lights when leaving a room.",
    points: 20,
    category: "Energy",
  },
  {
    id: 2,
    title: "Use natural daylight",
    description: "Open curtains and reduce unnecessary daytime lighting.",
    points: 25,
    category: "Energy",
  },
  {
    id: 3,
    title: "Reduce single-use plastic",
    description: "Carry a reusable bottle or bag instead of single-use plastic.",
    points: 30,
    category: "Waste",
  },
];

function Metric({
  icon: Icon,
  label,
  value,
  unit,
  note,
  color = "green",
}) {
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [completedChallenges, setCompletedChallenges] = useState([]);

  const completedPoints = initialChallenges.reduce((total, challenge) => {
    return completedChallenges.includes(challenge.id)
      ? total + challenge.points
      : total;
  }, 0);

  const completedCount = completedChallenges.length;

  async function handleCalculate(event) {
    event.preventDefault();
    setError("");

    const value = Number(electricity);

    if (!Number.isFinite(value) || value <= 0 || value > 100000) {
      setError("Enter an electricity usage value greater than 0 and no more than 100,000 kWh.");
      setFootprintResult(null);
      return;
    }

    setLoading(true);

    try {
      const result = await calculateFootprint(value);
      setFootprintResult(result);
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the backend. Check that your FastAPI server is running."
      );
      setFootprintResult(null);
    } finally {
      setLoading(false);
    }
  }

  function toggleChallenge(challengeId) {
    setCompletedChallenges((previous) =>
      previous.includes(challengeId)
        ? previous.filter((id) => id !== challengeId)
        : [...previous, challengeId]
    );
  }

  function resetCalculator() {
    setElectricity("186");
    setFootprintResult(null);
    setError("");
  }

  const emissions = footprintResult
    ? footprintResult.estimated_monthly_emissions_kg_co2
    : null;

  const calculatedElectricity = footprintResult
    ? footprintResult.monthly_electricity_kwh
    : null;

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

          <a href="#energy" className="nav-link">
            <Zap size={19} />
            <span>Energy Tracker</span>
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
              <strong>{completedCount} / {initialChallenges.length}</strong>
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
            API-connected calculator
          </div>
        </header>

        {/* Metric cards */}
        <section className="metrics-grid" aria-label="Impact metrics">
          <Metric
            icon={Leaf}
            label="Monthly carbon emissions"
            value={emissions !== null ? emissions.toLocaleString("en-IN") : "—"}
            unit="kg CO₂"
            note={
              emissions !== null
                ? "Calculated by the backend"
                : "Calculate your footprint below"
            }
            color="green"
          />

          <Metric
            icon={Zap}
            label="Monthly electricity"
            value={
              calculatedElectricity !== null
                ? calculatedElectricity.toLocaleString("en-IN")
                : "—"
            }
            unit="kWh"
            note={
              calculatedElectricity !== null
                ? "Your submitted monthly usage"
                : "Enter your usage to get started"
            }
            color="yellow"
          />

          <Metric
            icon={TrendingDown}
            label="Footprint reduction"
            value="—"
            unit=""
            note="Available after historical tracking"
            color="blue"
          />

          <Metric
            icon={Trophy}
            label="Green challenge points"
            value={completedPoints.toString()}
            unit="pts"
            note={`${completedCount} challenge${completedCount === 1 ? "" : "s"} completed this session`}
            color="purple"
          />
        </section>

        {/* Footprint calculator and chart */}
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
                  <span> kg CO₂ / month</span>
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

                {Array.isArray(footprintResult.recommendations) &&
                  footprintResult.recommendations.length > 0 && (
                    <div className="recommendations">
                      <h3>Recommended actions</h3>
                      <ul>
                        {footprintResult.recommendations.map(
                          (recommendation, index) => (
                            <li key={`${index}-${recommendation}`}>
                              <CheckCircle2 size={16} />
                              <span>{recommendation}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
              </div>
            )}
          </div>

          <div className="panel chart-panel" id="energy">
            <SectionHeader
              title="Weekly energy overview"
              subtitle="Sample data — historical tracking not connected yet."
              icon={Zap}
            />

            <div className="chart-summary">
              <div>
                <span className="chart-summary-label">
                  Average daily usage
                </span>
                <strong>5.9 kWh</strong>
              </div>
              <span className="chart-badge">Sample data</span>
            </div>

            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={weeklyData}
                  margin={{ top: 12, right: 8, left: -18, bottom: 0 }}
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
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#7c887f", fontSize: 12 }}
                    dy={8}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#7c887f", fontSize: 12 }}
                    tickFormatter={(value) => `${value}`}
                  />

                  <Tooltip
                    formatter={(value) => [`${value} kWh`, "Energy"]}
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid #e4ebe5",
                      boxShadow: "0 4px 16px rgba(20, 50, 30, 0.08)",
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="energy"
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
              <span>Illustrative daily energy consumption</span>
            </div>
          </div>
        </section>

        {/* Green challenges */}
        <section className="panel challenges-panel" id="challenges">
          <SectionHeader
            title="Green challenges"
            subtitle="Complete small sustainability actions to earn points."
            icon={Trophy}
          />

          <div className="challenge-progress">
            <div className="challenge-progress-copy">
              <span>Your session progress</span>
              <strong>
                {completedCount} of {initialChallenges.length} completed
              </strong>
            </div>

            <div
              className="progress-track"
              role="progressbar"
              aria-valuenow={completedCount}
              aria-valuemin={0}
              aria-valuemax={initialChallenges.length}
              aria-label="Green challenges completed"
            >
              <div
                className="progress-fill"
                style={{
                  width: `${
                    (completedCount / initialChallenges.length) * 100
                  }%`,
                }}
              />
            </div>
          </div>

          <div className="challenges-list">
            {initialChallenges.map((challenge) => {
              const completed = completedChallenges.includes(challenge.id);

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
                    onClick={() => toggleChallenge(challenge.id)}
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

          <p className="challenge-disclaimer">
            Challenge completion and points are stored in the current browser
            session only. Database persistence is not connected yet.
          </p>
        </section>

        {/* Solar energy section */}
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

          <a
            href="#footprint"
            className="solar-action"
            onClick={() => {
              document.getElementById("electricity")?.focus();
            }}
          >
            Review usage
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
