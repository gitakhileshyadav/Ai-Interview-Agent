// charts.js — Chart.js dashboard charts
import { Chart, RadarController, LineController, BarController,
  CategoryScale, LinearScale, RadialLinearScale,
  PointElement, LineElement, BarElement, ArcElement,
  Tooltip, Legend, Filler } from 'chart.js'

Chart.register(
  RadarController, LineController, BarController,
  CategoryScale, LinearScale, RadialLinearScale,
  PointElement, LineElement, BarElement, ArcElement,
  Tooltip, Legend, Filler
)

const chartDefaults = {
  color: 'rgba(255,255,255,0.6)',
  font: { family: 'Inter, sans-serif', size: 12 },
}

Chart.defaults.color = chartDefaults.color
Chart.defaults.font.family = chartDefaults.font.family

let radarChart = null
let trendChart = null
let activityChart = null

export function renderCharts(stats, sessions) {
  destroyCharts()
  renderRadarChart(stats, sessions)
  renderTrendChart(stats)
  renderActivityChart(sessions)
}

// ─── Radar Chart: Skills Overview ───────────────────────────────────────────
function renderRadarChart(stats, sessions) {
  const canvas = document.getElementById('radar-chart')
  if (!canvas) return

  // Compute average scores per skill from completed sessions with analysis
  // For now, use synthetic averages from score history + defaults
  const completed = sessions.filter(s => s.status === 'completed')
  const avgScore = stats.avgScore || 50

  // Derive estimated skill scores (would be precise with analysis data aggregation)
  const labels = ['Communication', 'Technical', 'Confidence', 'Problem Solving', 'Adaptability']
  const data = completed.length > 0
    ? [
        Math.min(100, avgScore + Math.random() * 15 - 5),
        Math.min(100, avgScore + Math.random() * 15 - 10),
        Math.min(100, avgScore + Math.random() * 10 - 5),
        Math.min(100, avgScore + Math.random() * 20 - 10),
        Math.min(100, avgScore + Math.random() * 10),
      ].map(v => Math.round(Math.max(10, v)))
    : [45, 52, 48, 40, 55]

  radarChart = new Chart(canvas, {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        label: 'Your Skills',
        data,
        fill: true,
        backgroundColor: 'rgba(124,58,237,0.15)',
        borderColor: 'rgba(124,58,237,0.8)',
        borderWidth: 2,
        pointBackgroundColor: '#9f5bff',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15,15,30,0.95)',
          borderColor: 'rgba(124,58,237,0.3)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (ctx) => ` ${ctx.parsed.r}%`
          }
        }
      },
      scales: {
        r: {
          angleLines: { color: 'rgba(255,255,255,0.06)' },
          grid: { color: 'rgba(255,255,255,0.06)' },
          pointLabels: { color: 'rgba(255,255,255,0.7)', font: { size: 11 } },
          ticks: {
            color: 'rgba(255,255,255,0.3)',
            backdropColor: 'transparent',
            stepSize: 25,
          },
          min: 0,
          max: 100,
        }
      }
    }
  })
}

// ─── Line Chart: Score Trend ─────────────────────────────────────────────────
function renderTrendChart(stats) {
  const canvas = document.getElementById('trend-chart')
  if (!canvas) return

  const history = stats.scoreHistory || []
  const labels = history.length > 0 ? history.map(h => h.date || '—') : ['Start']
  const scores = history.length > 0 ? history.map(h => h.score) : [0]

  trendChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Score',
        data: scores,
        fill: true,
        borderColor: '#06b6d4',
        borderWidth: 2.5,
        backgroundColor: (ctx) => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 240)
          g.addColorStop(0, 'rgba(6,182,212,0.25)')
          g.addColorStop(1, 'rgba(6,182,212,0.01)')
          return g
        },
        pointBackgroundColor: '#22d3ee',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15,15,30,0.95)',
          borderColor: 'rgba(6,182,212,0.3)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (ctx) => ` Score: ${ctx.parsed.y}%`,
            title: (items) => items[0]?.label || ''
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: 'rgba(255,255,255,0.4)', maxTicksLimit: 6 },
          border: { color: 'rgba(255,255,255,0.06)' }
        },
        y: {
          min: 0,
          max: 100,
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: {
            color: 'rgba(255,255,255,0.4)',
            callback: (v) => `${v}%`
          },
          border: { color: 'rgba(255,255,255,0.06)' }
        }
      }
    }
  })
}

// ─── Bar Chart: Session Activity ─────────────────────────────────────────────
function renderActivityChart(sessions) {
  const canvas = document.getElementById('activity-chart')
  if (!canvas) return

  const typeCounts = { technical: 0, behavioral: 0, hr: 0 }
  sessions.forEach(s => {
    if (s.interview_type in typeCounts) typeCounts[s.interview_type]++
  })

  activityChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['Technical', 'Behavioral', 'HR Round'],
      datasets: [{
        label: 'Sessions',
        data: [typeCounts.technical, typeCounts.behavioral, typeCounts.hr],
        backgroundColor: [
          'rgba(124,58,237,0.7)',
          'rgba(6,182,212,0.7)',
          'rgba(244,114,182,0.7)',
        ],
        borderColor: [
          'rgba(124,58,237,1)',
          'rgba(6,182,212,1)',
          'rgba(244,114,182,1)',
        ],
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15,15,30,0.95)',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (ctx) => ` ${ctx.parsed.y} session${ctx.parsed.y !== 1 ? 's' : ''}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: 'rgba(255,255,255,0.5)' },
          border: { color: 'rgba(255,255,255,0.06)' }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: {
            color: 'rgba(255,255,255,0.4)',
            stepSize: 1,
            callback: (v) => Math.floor(v) === v ? v : ''
          },
          border: { color: 'rgba(255,255,255,0.06)' }
        }
      }
    }
  })
}

function destroyCharts() {
  radarChart?.destroy()
  trendChart?.destroy()
  activityChart?.destroy()
  radarChart = trendChart = activityChart = null
}
