<template>
  <div class="dashboard-container">
    <div class="dashboard-header">
      <h1>📊 运营统计仪表盘</h1>
      <p class="header-subtitle">匿名汇总，洞察每一份被宽恕的心意</p>
    </div>

    <div v-if="loading" class="loading-wrap">
      <div class="spinner"></div>
      <p>正在加载统计数据...</p>
    </div>

    <div v-else-if="error" class="error-wrap">
      <span class="error-icon">⚠️</span>
      <p>{{ error }}</p>
      <button class="btn btn-primary" @click="loadStats">重新加载</button>
    </div>

    <template v-else>
      <div class="stats-row">
        <div class="stat-card stat-total">
          <div class="stat-icon-wrap">
            <span class="stat-icon">💜</span>
          </div>
          <div class="stat-content">
            <span class="stat-label">秘密总量</span>
            <span class="stat-value">{{ stats.total }}</span>
          </div>
          <div class="stat-bg"></div>
        </div>

        <div class="stat-card stat-today">
          <div class="stat-icon-wrap">
            <span class="stat-icon">✨</span>
          </div>
          <div class="stat-content">
            <span class="stat-label">今日新增</span>
            <span class="stat-value">{{ stats.todayCount }}</span>
          </div>
          <div class="stat-bg"></div>
        </div>

        <div class="stat-card stat-public">
          <div class="stat-icon-wrap">
            <span class="stat-icon">🌍</span>
          </div>
          <div class="stat-content">
            <span class="stat-label">公开占比</span>
            <span class="stat-value">{{ stats.publicRatio }}%</span>
          </div>
          <div class="progress-ring">
            <svg viewBox="0 0 80 80">
              <circle class="ring-bg" cx="40" cy="40" r="34" />
              <circle
                class="ring-fill"
                cx="40" cy="40" r="34"
                :style="{ strokeDasharray: ringDasharray, strokeDashoffset: ringDashoffset }"
              />
            </svg>
          </div>
          <div class="stat-bg"></div>
        </div>

        <div class="stat-card stat-private">
          <div class="stat-icon-wrap">
            <span class="stat-icon">🔒</span>
          </div>
          <div class="stat-content">
            <span class="stat-label">私密收藏</span>
            <span class="stat-value">{{ stats.total - stats.publicCount }}</span>
          </div>
          <div class="stat-bg"></div>
        </div>
      </div>

      <div class="chart-row">
        <div class="chart-card">
          <div class="chart-header">
            <h3>📂 主题分布</h3>
            <span class="chart-tip">共 {{ stats.total }} 条</span>
          </div>
          <div class="chart-body topic-chart">
            <div
              v-for="(item, key) in sortedTopicList"
              :key="key"
              class="topic-item"
            >
              <div class="topic-info">
                <span class="topic-icon">{{ item.icon }}</span>
                <span class="topic-label">{{ item.label }}</span>
              </div>
              <div class="topic-bar-wrap">
                <div
                  class="topic-bar"
                  :style="{ width: getPercent(item.count, stats.total) + '%' }"
                ></div>
              </div>
              <div class="topic-count">
                <span class="count-num">{{ item.count }}</span>
                <span class="count-pct">{{ getPercent(item.count, stats.total) }}%</span>
              </div>
            </div>
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-header">
            <h3>💭 心情分布</h3>
            <span class="chart-tip">共 {{ stats.total }} 条</span>
          </div>
          <div class="chart-body mood-chart">
            <div class="mood-donut-wrap">
              <svg viewBox="0 0 200 200" class="mood-donut">
                <g transform="translate(100,100)">
                  <path
                    v-for="(seg, idx) in moodSegments"
                    :key="idx"
                    :d="seg.path"
                    :fill="seg.color"
                    class="mood-seg"
                  />
                </g>
              </svg>
              <div class="mood-center">
                <span class="mood-total">{{ stats.total }}</span>
                <span class="mood-center-label">总心情</span>
              </div>
            </div>
            <div class="mood-legend">
              <div
                v-for="(item, key) in sortedMoodList"
                :key="key"
                class="mood-legend-item"
              >
                <span class="legend-dot" :style="{ background: item.color }"></span>
                <span class="legend-icon">{{ item.icon }}</span>
                <span class="legend-label">{{ item.label }}</span>
                <span class="legend-count">{{ item.count }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="chart-row">
        <div class="chart-card full-width">
          <div class="chart-header">
            <h3>📈 最近七天提交趋势</h3>
            <div class="chart-summary">
              <span class="summary-item">
                <span class="summary-dot"></span>
                日均 <strong>{{ avgDaily }}</strong> 条
              </span>
              <span class="summary-item peak">
                峰值 <strong>{{ peakDay }}</strong>（{{ peakCount }} 条）
              </span>
            </div>
          </div>
          <div class="chart-body trend-chart">
            <div class="trend-grid">
              <div
                v-for="(day, idx) in stats.last7Days"
                :key="idx"
                class="trend-col"
              >
                <div class="trend-bar-wrap">
                  <span v-if="day.count > 0" class="trend-bar-value">{{ day.count }}</span>
                  <div
                    class="trend-bar"
                    :style="{ height: getTrendHeight(day.count) + '%' }"
                    :class="{ peak: day.count === peakCount, today: idx === stats.last7Days.length - 1 }"
                  ></div>
                </div>
                <div class="trend-label">
                  <span class="trend-date">{{ day.date }}</span>
                  <span class="trend-day" :class="{ today: idx === stats.last7Days.length - 1 }">
                    {{ idx === stats.last7Days.length - 1 ? '今天' : day.day }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const loading = ref(true)
const error = ref('')
const stats = ref({
  total: 0,
  todayCount: 0,
  publicCount: 0,
  publicRatio: 0,
  topicDistribution: {},
  moodDistribution: {},
  last7Days: []
})

const RING_CIRC = 2 * Math.PI * 34

const ringDasharray = `${RING_CIRC} ${RING_CIRC}`
const ringDashoffset = computed(() => {
  const ratio = (100 - stats.value.publicRatio) / 100
  return RING_CIRC * ratio
})

const sortedTopicList = computed(() => {
  const arr = Object.entries(stats.value.topicDistribution || {}).map(([key, val]) => ({
    key,
    ...val
  }))
  return arr.sort((a, b) => b.count - a.count)
})

const sortedMoodList = computed(() => {
  const arr = Object.entries(stats.value.moodDistribution || {}).map(([key, val]) => ({
    key,
    ...val
  }))
  return arr.sort((a, b) => b.count - a.count)
})

const moodSegments = computed(() => {
  const entries = Object.values(stats.value.moodDistribution || {})
  const total = entries.reduce((sum, e) => sum + e.count, 0)
  if (total === 0) return []

  const segments = []
  let startAngle = -Math.PI / 2
  const radius = 75
  const inner = 50

  entries.forEach((mood) => {
    if (mood.count === 0) return
    const angle = (mood.count / total) * Math.PI * 2
    const endAngle = startAngle + angle
    const large = angle > Math.PI ? 1 : 0

    const x1 = radius * Math.cos(startAngle)
    const y1 = radius * Math.sin(startAngle)
    const x2 = radius * Math.cos(endAngle)
    const y2 = radius * Math.sin(endAngle)
    const x3 = inner * Math.cos(endAngle)
    const y3 = inner * Math.sin(endAngle)
    const x4 = inner * Math.cos(startAngle)
    const y4 = inner * Math.sin(startAngle)

    const path = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${inner} ${inner} 0 ${large} 0 ${x4} ${y4}`,
      'Z'
    ].join(' ')

    segments.push({ path, color: mood.color, label: mood.label })
    startAngle = endAngle
  })

  return segments
})

const maxTrendCount = computed(() => {
  const days = stats.value.last7Days || []
  return Math.max(1, ...days.map(d => d.count))
})

const peakDay = computed(() => {
  const days = stats.value.last7Days || []
  let max = -1
  let label = '—'
  days.forEach(d => {
    if (d.count > max) {
      max = d.count
      label = d.day
    }
  })
  return label
})

const peakCount = computed(() => {
  const days = stats.value.last7Days || []
  return Math.max(0, ...days.map(d => d.count))
})

const avgDaily = computed(() => {
  const days = stats.value.last7Days || []
  const sum = days.reduce((s, d) => s + d.count, 0)
  return Math.round(sum / Math.max(1, days.length))
})

function getPercent(part, whole) {
  if (!whole) return 0
  return Math.round((part / whole) * 100)
}

function getTrendHeight(count) {
  return maxTrendCount.value > 0 ? (count / maxTrendCount.value) * 100 : 0
}

async function loadStats() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('/api/stats')
    const data = await res.json()
    if (res.ok) {
      stats.value = data
    } else {
      error.value = data.error || '加载统计数据失败'
    }
  } catch (e) {
    console.error(e)
    error.value = '无法连接到服务器'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.dashboard-container {
  width: 100%;
  max-width: 1100px;
  padding: 20px 0;
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.dashboard-header {
  text-align: center;
  margin-bottom: 36px;
  color: white;
}

.dashboard-header h1 {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 10px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.header-subtitle {
  font-size: 16px;
  opacity: 0.9;
}

.loading-wrap, .error-wrap {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 60px 40px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(102, 126, 234, 0.2);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-wrap p, .error-wrap p {
  color: #666;
  font-size: 16px;
  margin-bottom: 20px;
}

.error-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  position: relative;
  background: rgba(255, 255, 255, 0.97);
  border-radius: 18px;
  padding: 24px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.2);
}

.stat-bg {
  position: absolute;
  top: -30px;
  right: -30px;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  opacity: 0.06;
}

.stat-total .stat-bg { background: #ec4899; }
.stat-today .stat-bg { background: #8b5cf6; }
.stat-public .stat-bg { background: #10b981; }
.stat-private .stat-bg { background: #f59e0b; }

.stat-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.stat-total .stat-icon-wrap { background: linear-gradient(135deg, #fce7f3 0%, #fdf2f8 100%); }
.stat-today .stat-icon-wrap { background: linear-gradient(135deg, #ede9fe 0%, #f5f3ff 100%); }
.stat-public .stat-icon-wrap { background: linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%); }
.stat-private .stat-icon-wrap { background: linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%); }

.stat-icon {
  font-size: 28px;
}

.stat-content {
  position: relative;
  z-index: 1;
}

.stat-label {
  display: block;
  color: #888;
  font-size: 14px;
  margin-bottom: 6px;
  font-weight: 500;
}

.stat-value {
  display: block;
  font-size: 38px;
  font-weight: 700;
  color: #222;
  line-height: 1;
}

.stat-total .stat-value { background: linear-gradient(135deg, #ec4899, #be185d); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.stat-today .stat-value { background: linear-gradient(135deg, #8b5cf6, #6d28d9); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.stat-public .stat-value { background: linear-gradient(135deg, #10b981, #047857); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.stat-private .stat-value { background: linear-gradient(135deg, #f59e0b, #b45309); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

.progress-ring {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 80px;
  height: 80px;
}

.progress-ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-bg {
  fill: none;
  stroke: #e5e7eb;
  stroke-width: 7;
}

.ring-fill {
  fill: none;
  stroke: url(#greenGrad);
  stroke: #10b981;
  stroke-width: 7;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.8s ease;
}

.chart-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

@media (max-width: 768px) {
  .chart-row {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  background: rgba(255, 255, 255, 0.97);
  border-radius: 18px;
  padding: 28px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.chart-card.full-width {
  grid-column: 1 / -1;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.chart-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.chart-tip {
  font-size: 13px;
  color: #999;
  padding: 4px 12px;
  background: #f8f8f8;
  border-radius: 12px;
}

.chart-summary {
  display: flex;
  gap: 20px;
  align-items: center;
}

.summary-item {
  font-size: 13px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 6px;
}

.summary-item strong {
  color: #667eea;
  font-weight: 600;
}

.summary-item.peak strong {
  color: #ec4899;
}

.summary-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.topic-chart {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.topic-item {
  display: grid;
  grid-template-columns: 110px 1fr 90px;
  align-items: center;
  gap: 12px;
}

.topic-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.topic-icon {
  font-size: 20px;
}

.topic-label {
  font-size: 13px;
  color: #444;
  font-weight: 500;
}

.topic-bar-wrap {
  height: 10px;
  background: #f3f4f6;
  border-radius: 5px;
  overflow: hidden;
}

.topic-bar {
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 5px;
  transition: width 0.8s ease;
  min-width: 2px;
}

.topic-count {
  text-align: right;
  font-size: 12px;
}

.count-num {
  font-weight: 600;
  color: #333;
  margin-right: 6px;
}

.count-pct {
  color: #999;
  font-size: 11px;
}

.mood-chart {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 20px;
  align-items: center;
}

@media (max-width: 520px) {
  .mood-chart {
    grid-template-columns: 1fr;
    justify-items: center;
  }
}

.mood-donut-wrap {
  position: relative;
  width: 200px;
  height: 200px;
}

.mood-donut {
  width: 100%;
  height: 100%;
}

.mood-seg {
  transition: opacity 0.2s ease, transform 0.2s ease;
  transform-origin: center;
  cursor: pointer;
}

.mood-seg:hover {
  opacity: 0.85;
}

.mood-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.mood-total {
  display: block;
  font-size: 30px;
  font-weight: 700;
  color: #333;
  line-height: 1;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.mood-center-label {
  display: block;
  font-size: 11px;
  color: #999;
  margin-top: 4px;
}

.mood-legend {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mood-legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 10px;
  transition: background 0.2s ease;
}

.mood-legend-item:hover {
  background: #f3f4f6;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-icon {
  font-size: 18px;
}

.legend-label {
  flex: 1;
  font-size: 13px;
  color: #555;
}

.legend-count {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  min-width: 28px;
  text-align: right;
}

.trend-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12px;
  align-items: end;
  height: 260px;
  padding: 10px 0 0;
}

.trend-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.trend-bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  position: relative;
}

.trend-bar-value {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  font-size: 13px;
  font-weight: 600;
  color: #667eea;
  padding: 2px 6px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 6px;
}

.trend-bar {
  width: 70%;
  min-height: 4px;
  background: linear-gradient(180deg, #a5b4fc 0%, #667eea 100%);
  border-radius: 8px 8px 4px 4px;
  transition: height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
}

.trend-bar::before {
  content: '';
  position: absolute;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 4px;
  background: rgba(255, 255, 255, 0.35);
  border-radius: 2px;
}

.trend-bar.peak {
  background: linear-gradient(180deg, #f9a8d4 0%, #ec4899 100%);
}

.trend-bar.today {
  background: linear-gradient(180deg, #86efac 0%, #10b981 100%);
}

.trend-label {
  margin-top: 12px;
  text-align: center;
}

.trend-date {
  display: block;
  font-size: 12px;
  color: #999;
  margin-bottom: 2px;
}

.trend-day {
  display: block;
  font-size: 13px;
  color: #555;
  font-weight: 500;
}

.trend-day.today {
  color: #10b981;
  font-weight: 600;
}
</style>
