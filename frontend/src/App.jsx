
import { useState } from "react";
import {
  Leaf,
  LayoutDashboard,
  Zap,
  Sun,
  Trophy,
  Target,
  TrendingDown,
  TreePine,
  Menu,
  ArrowUpRight,
  CheckCircle2,
  Calculator,
  Lightbulb,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { calculateFootprint } from "./api";
import "./App.css";

const weeklyData = [
  { day: "Mon", usage: 12 },
  { day: "Tue", usage: 10 },
  { day: "Wed", usage: 11 },
  { day: "Thu", usage: 8 },
  { day: "Fri", usage: 9 },
  { day: "Sat", usage: 6 },
  { day: "Sun", usage: 7 },
];

const initialChallenges = [
  {
    id: 1,
    title: "Switch off unused appliances",
    points: 20,
    done: false,
  },
  {
    id: 2,
    title: "Use a reusable water bottle",
    points: 10,
    done: false,
  },
  {
    id: 3,
    title: "Reduce unnecessary lighting",
    points: 15,
    done: false,
  },
];

export default function App() {
  const [active, setActive] = useState("Overview");
  const [challenges, setChallenges] = useState(initialChallenges);
  const [menuOpen, setMenuOpen] = useState(false);

  const [electricity, setElectricity] = useState("186");
  const [footprintResult, setFootprintResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const completed = challenges.filter((item) => item.done).length;

  const points = challenges.reduce(
    (sum, challenge) =>
      sum + (challenge.done ? challenge.points : 0),
    120
  );

  const navigation = [
    { name: "Overview", icon: LayoutDashboard },
    { name: "Energy Tracker", icon: Zap },
    { name: "Solar Insights", icon: Sun },
    { name: "Green Challenges", icon: Trophy },
  ];

  function toggleChallenge(id) {
    setChallenges((items) =>
      items.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      )
    );
  }

  async function handleCalculate(event) {
    event.preventDefault();

    const value = Number(electricity);

    if (!Number.isFinite(value) || value <= 0 || value > 100000) {
      setApiError("Enter monthly electricity usage between 0 and 100000 kWh.");
      return;
    }

    setLoading(true);
    setApiError("");

    try {
      const result = await calculateFootprint(value);
      setFootprintResult(result);
    } catch (error) {
      setApiError(
        error.message ||
          "Unable to calculate emissions. Check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  const displayedFootprint = footprintResult
    ? footprintResult.estimated_monthly_emissions_kg_co2
    : null;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">
            <Leaf size={23} />
          </div>
          <div>
            <h2>MissionLiFE</h2>
            <span>IMPACT PLATFORM</span>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <nav>
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${active === name ? "selected" : ""}`}
              onClick={() => {
                setActive(name);
                setMenuOpen(false);
              }}
            >
              <Icon size={19} />
              <span>{name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="eco-card">
            <TreePine size={25} />
            <h3>Small actions.</h3>
            <h3>Lasting impact.</h3>
            <p>Every sustainable choice moves us forward.</p>
          </div>
          <span className="sidebar-footer">HACKCULT '26 · GEDA</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation"
          >
            <Menu size={22} />
          </button>

          <div className="breadcrumb">
            Workspace / <strong>{active}</strong>
          </div>

          <div className="profile">
            <span className="status-dot" />
            <span>Citizen Dashboard</span>
            <div className="avatar">C</div>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome">
            <div>
              <div className="eyebrow">
                <Leaf size={14} /> LIVE SUSTAINABLY
              </div>
              <h1>Your actions matter.</h1>
              <p>
                Track your impact, build greener habits, and make every day count.
              </p>
            </div>

            <div className="date-chip">
              MISSION LiFE <span>●</span> 2026
            </div>
          </section>

          <section className="panel calculator-panel">
            <div className="calculator-heading">
              <div className="calculator-icon">
                <Calculator size={20} />
              </div>
              <div>
                <span className="section-kicker">
                  PERSONALISED FOOTPRINT
                </span>
                <h2>Calculate your electricity emissions</h2>
                <p>
                  Enter your household's monthly electricity consumption.
                </p>
              </div>
            </div>

            <form
              className="calculator-form"
              onSubmit={handleCalculate}
            >
              <label htmlFor="electricity">
                Monthly electricity usage (kWh)
              </label>

              <input
                id="electricity"
                type="number"
                min="0.01"
                max="100000"
                step="any"
                value={electricity}
                onChange={(event) =>
                  setElectricity(event.target.value)
                }
                required
              />

              <button type="submit" disabled={loading}>
                {loading ? "Calculating..." : "Calculate footprint"}
              </button>
            </form>

            {apiError && (
              <p className="api-error" role="alert">
                {apiError}
              </p>
            )}

            {footprintResult && (
              <div className="calculation-result" aria-live="polite">
                <span>Estimated monthly emissions</span>

                <h3>{displayedFootprint} kg CO₂</h3>

                <p>{footprintResult.note}</p>

                <div className="result-details">
                  <span>Electricity usage</span>
                  <strong>
                    {footprintResult.monthly_electricity_kwh} kWh
                  </strong>
                </div>

                <div className="result-details">
                  <span>Emission factor used</span>
                  <strong>
                    {footprintResult.emission_factor_kg_co2_per_kwh} kg CO₂/kWh
                  </strong>
                </div>

                <strong className="recommendations-title">
                  Recommendations
                </strong>

                <ul>
                  {footprintResult.recommendations.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="metrics-grid">
            <Metric
              icon={Leaf}
              label="Carbon footprint"
              value={displayedFootprint ?? 124}
              unit="kg CO₂"
              note={
                footprintResult
                  ? "Calculated from your latest electricity input"
                  : "Illustrative monthly estimate"
              }
              color="green"
            />

            <Metric
              icon={Zap}
              label="Energy consumption"
              value={footprintResult?.monthly_electricity_kwh ?? 186}
              unit="kWh"
              note={
                footprintResult
                  ? "Latest calculated electricity usage"
                  : "Illustrative monthly usage"
              }
              color="amber"
            />

            <Metric
              icon={Trophy}
              label="Green points"
              value={points}
              unit="PTS"
              note="Complete challenges to earn more"
              color="purple"
            />

            <Metric
              icon={TrendingDown}
              label="Footprint reduction"
              value="12%"
              unit=""
              note="Illustrative progress indicator"
              color="blue"
            />
          </section>

          <section className="content-grid">
            <div className="panel energy-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">
                    ENERGY ANALYTICS
                  </span>
                  <h2>Weekly energy overview</h2>
                  <p>Illustrative daily energy consumption</p>
                </div>

                <div className="chart-icon">
                  <Zap size={20} />
                </div>
              </div>

              <div className="chart-legend">
                <span>
                  <i /> Energy usage (kWh)
                </span>
                <span className="chart-period">LAST 7 DAYS</span>
              </div>

              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={weeklyData}
                    margin={{
                      top: 10,
                      right: 8,
                      left: -20,
                      bottom: 0,
                    }}
                  >
                    <defs>
                      <linearGradient
                        id="energyFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#39b879"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="100%"
                          stopColor="#39b879"
                          stopOpacity={0.01}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#26332e"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="day"
                      stroke="#84928a"
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      stroke="#84928a"
                      axisLine={false}
                      tickLine={false}
                    />

                    <Tooltip
                      contentStyle={{
                        background: "#18221d",
                        border: "1px solid #34473b",
                        borderRadius: 10,
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="usage"
                      name="Energy usage"
                      stroke="#39b879"
                      strokeWidth={3}
                      fill="url(#energyFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-footnote">
                <span />
                Sample data — replace with measured usage
              </div>
            </div>

            <div className="panel score-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">YOUR PROGRESS</span>
                  <h2>Green impact score</h2>
                  <p>A simple challenge-based score</p>
                </div>
                <Target size={21} color="#39b879" />
              </div>

              <div className="score-circle">
                <div>
                  <strong>{Math.min(100, 64 + completed * 5)}</strong>
                  <span>OUT OF 100</span>
                </div>
              </div>

              <div className="score-status">
                <CheckCircle2 size={16} />
                Keep building greener habits
              </div>

              <div className="score-divider" />

              <div className="score-row">
                <span>Challenges completed</span>
                <strong>{completed}/3</strong>
              </div>

              <div className="progress-track">
                <div
                  style={{ width: `${(completed / 3) * 100}%` }}
                />
              </div>

              <div className="score-row">
                <span>Green points</span>
                <strong>{points}</strong>
              </div>
            </div>
          </section>

          <section className="bottom-grid">
            <div className="panel challenges-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">TAKE ACTION</span>
                  <h2>Green challenges</h2>
                  <p>Small steps that make a difference</p>
                </div>

                <span className="count-badge">
                  {completed}/3 DONE
                </span>
              </div>

              <div className="challenge-list">
                {challenges.map((challenge) => (
                  <div
                    className={`challenge-row ${
                      challenge.done ? "challenge-done" : ""
                    }`}
                    key={challenge.id}
                  >
                    <button
                      className="challenge-check"
                      onClick={() => toggleChallenge(challenge.id)}
                      aria-label={`Toggle ${challenge.title}`}
                    >
                      {challenge.done && <CheckCircle2 size={19} />}
                    </button>

                    <div className="challenge-text">
                      <strong>{challenge.title}</strong>
                      <span>
                        {challenge.done
                          ? "Completed — great work!"
                          : "Daily sustainability action"}
                      </span>
                    </div>

                    <div className="points">
                      +{challenge.points} <span>pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel solar-panel">
              <div className="solar-icon">
                <Sun size={25} />
              </div>

              <span className="section-kicker">
                RENEWABLE ENERGY
              </span>

              <h2>Explore rooftop solar</h2>

              <p>
                Discover how solar energy could help reduce grid
                electricity use and household energy costs.
              </p>

              <button
                className="solar-button"
                onClick={() => setActive("Solar Insights")}
              >
                Explore solar insights <ArrowUpRight size={17} />
              </button>

              <div className="solar-decoration">
                <Lightbulb size={76} />
              </div>
            </div>
          </section>

          <footer className="page-footer">
            <span>
              <Leaf size={14} /> MissionLiFE-Impact
            </span>
            <span>
              HackCult '26 · Green Energy & Sustainability
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function Metric({ icon: Icon, label, value, unit, note, color }) {
  return (
    <div className="panel metric-card">
      <div className={`metric-icon ${color}`}>
        <Icon size={20} />
      </div>
      <span className="metric-label">{label}</span>
      <div className="metric-value">
        {value} <span>{unit}</span>
      </div>
      <div className="metric-note">{note}</div>
    </div>
  );
}
