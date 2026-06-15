<template>
  <div class="confess-container">
    <ForgivenessAnimation
      :visible="showAnimation"
      @complete="handleAnimationComplete"
    />

    <div class="card confess-card" v-if="!showAnimation && !showComplete">
      <div class="card-header">
        <span class="icon">🕊️</span>
        <h2>倾诉你的秘密</h2>
        <p class="subtitle">这里是一个安全的空间，你的秘密将被匿名保存并宽恕</p>
      </div>

      <div class="form-group">
        <textarea
          v-model="secretContent"
          class="secret-input"
          placeholder="在这里写下你想说的话...&#10;&#10;也许是一件愧疚的事，&#10;也许是一个深藏的秘密，&#10;也许只是想找个地方倾诉..."
          rows="8"
          :disabled="submitting"
        ></textarea>
        <div class="char-count">
          {{ secretContent.length }} / 500
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">📂 选择主题</label>
        <div class="option-grid topic-grid">
          <div
            v-for="(info, key) in topics"
            :key="key"
            class="option-item"
            :class="{ active: selectedTopic === key }"
            @click="selectedTopic = key"
          >
            <span class="option-icon">{{ info.icon }}</span>
            <span class="option-label">{{ info.label }}</span>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">💭 此刻心情</label>
        <div class="option-grid mood-grid">
          <div
            v-for="(info, key) in moods"
            :key="key"
            class="option-item"
            :class="{ active: selectedMood === key }"
            :style="selectedMood === key ? { borderColor: info.color, background: info.color + '15' } : {}"
            @click="selectedMood = key"
          >
            <span class="option-icon">{{ info.icon }}</span>
            <span class="option-label">{{ info.label }}</span>
          </div>
        </div>
      </div>

      <div class="form-group privacy-group">
        <label class="privacy-label">
          <input type="checkbox" v-model="isPublic" class="privacy-checkbox" />
          <span class="privacy-text">
            <span class="privacy-icon">🌍</span>
            <span>公开分享（他人可随机看到这条秘密）</span>
          </span>
        </label>
        <p class="privacy-hint">
          {{ isPublic ? '你的故事可能温暖另一个需要治愈的人' : '仅用于统计，不会被任何人看到' }}
        </p>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <div class="form-actions">
        <button
          class="btn btn-primary submit-btn"
          @click="submitSecret"
          :disabled="submitting || !secretContent.trim() || secretContent.length > 500"
        >
          <span v-if="submitting">
            <span class="btn-spinner"></span>
            提交中...
          </span>
          <span v-else>
            🌸 获得宽恕
          </span>
        </button>
      </div>

      <div class="tips">
        <p>💡 提示：你的秘密会被匿名保存，没有人会知道是谁分享的</p>
        <p>🌈 提交后，它将被自动标记为「已宽恕」</p>
      </div>
    </div>

    <div class="card complete-card" v-else-if="showComplete">
      <div class="complete-content">
        <span class="complete-icon">💜</span>
        <h2>宽恕已完成</h2>
        <p>你的秘密已经被温柔地保存</p>
        <p>愿你获得内心的平静</p>
        <div class="complete-actions">
          <button class="btn btn-secondary" @click="resetForm">
            再分享一个
          </button>
          <button class="btn btn-primary" @click="goHome">
            回到首页
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import ForgivenessAnimation from '../components/ForgivenessAnimation.vue'

const router = useRouter()
const secretContent = ref('')
const submitting = ref(false)
const error = ref('')
const showAnimation = ref(false)
const showComplete = ref(false)
const selectedTopic = ref('other')
const selectedMood = ref('regret')
const isPublic = ref(true)

const topics = {
  family: { label: '家庭亲情', icon: '👨‍👩‍👧' },
  friendship: { label: '友情交往', icon: '🤝' },
  love: { label: '爱情心事', icon: '💕' },
  work: { label: '工作职场', icon: '💼' },
  study: { label: '学业成长', icon: '📚' },
  self: { label: '自我反思', icon: '🌱' },
  other: { label: '其他', icon: '✨' }
}

const moods = {
  regret: { label: '愧疚后悔', icon: '😔', color: '#f59e0b' },
  sad: { label: '难过悲伤', icon: '😢', color: '#6366f1' },
  angry: { label: '愤怒不满', icon: '😠', color: '#ef4444' },
  confused: { label: '迷茫困惑', icon: '😕', color: '#8b5cf6' },
  relieved: { label: '如释重负', icon: '😌', color: '#10b981' },
  hopeful: { label: '充满希望', icon: '😊', color: '#ec4899' }
}

async function submitSecret() {
  if (!secretContent.value.trim()) {
    error.value = '请输入你想倾诉的内容'
    return
  }

  if (secretContent.value.length > 500) {
    error.value = '内容不能超过500字'
    return
  }

  submitting.value = true
  error.value = ''

  try {
    const response = await fetch('/api/secrets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: secretContent.value,
        topic: selectedTopic.value,
        mood: selectedMood.value,
        isPublic: isPublic.value
      })
    })

    const data = await response.json()

    if (response.ok) {
      showAnimation.value = true
    } else {
      error.value = data.error || '提交失败，请稍后重试'
      submitting.value = false
    }
  } catch (err) {
    console.error('提交失败:', err)
    error.value = '无法连接到服务器，请稍后重试'
    submitting.value = false
  }
}

function handleAnimationComplete() {
  showAnimation.value = false
  showComplete.value = true
}

function resetForm() {
  secretContent.value = ''
  showComplete.value = false
  error.value = ''
  submitting.value = false
  selectedTopic.value = 'other'
  selectedMood.value = 'regret'
  isPublic.value = true
}

function goHome() {
  router.push('/')
}
</script>

<style scoped>
.confess-container {
  width: 100%;
  max-width: 600px;
}

.confess-card {
  animation: slideUp 0.6s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-header {
  text-align: center;
  margin-bottom: 30px;
}

.icon {
  font-size: 56px;
  display: block;
  margin-bottom: 15px;
}

.card-header h2 {
  color: #333;
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 10px;
}

.subtitle {
  color: #666;
  font-size: 15px;
  line-height: 1.6;
}

.form-group {
  margin-bottom: 25px;
  position: relative;
}

.form-label {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.secret-input {
  width: 100%;
  padding: 20px;
  border: 2px solid #e0e0e0;
  border-radius: 15px;
  font-size: 16px;
  font-family: inherit;
  resize: none;
  transition: all 0.3s ease;
  line-height: 1.8;
  background: #fafafa;
}

.secret-input:focus {
  outline: none;
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.secret-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.secret-input::placeholder {
  color: #aaa;
  line-height: 1.8;
}

.char-count {
  position: absolute;
  bottom: 10px;
  right: 15px;
  font-size: 13px;
  color: #999;
}

.option-grid {
  display: grid;
  gap: 10px;
}

.topic-grid {
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
}

.mood-grid {
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
}

.option-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 10px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.25s ease;
  user-select: none;
}

.option-item:hover {
  border-color: #667eea;
  background: #f8f9ff;
  transform: translateY(-2px);
}

.option-item.active {
  border-color: #667eea;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
}

.option-icon {
  font-size: 28px;
}

.option-label {
  font-size: 13px;
  color: #555;
  font-weight: 500;
}

.option-item.active .option-label {
  color: #667eea;
  font-weight: 600;
}

.privacy-group {
  padding: 18px 20px;
  background: linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%);
  border-radius: 15px;
  border-left: 4px solid #10b981;
}

.privacy-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.privacy-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #10b981;
}

.privacy-text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

.privacy-icon {
  font-size: 18px;
}

.privacy-hint {
  margin-top: 8px;
  margin-left: 32px;
  font-size: 13px;
  color: #666;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 12px 20px;
  border-radius: 10px;
  margin-bottom: 20px;
  font-size: 14px;
  border-left: 4px solid #dc2626;
}

.form-actions {
  text-align: center;
  margin-bottom: 30px;
}

.submit-btn {
  min-width: 200px;
  font-size: 18px;
  padding: 15px 40px;
}

.btn-spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 8px;
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.tips {
  background: linear-gradient(135deg, #fef9e7 0%, #fdf2e9 100%);
  padding: 20px;
  border-radius: 15px;
  border-left: 4px solid #f59e0b;
}

.tips p {
  color: #78350f;
  font-size: 14px;
  margin-bottom: 8px;
  line-height: 1.6;
}

.tips p:last-child {
  margin-bottom: 0;
}

.complete-card {
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.complete-content {
  text-align: center;
  padding: 30px 20px;
}

.complete-icon {
  font-size: 72px;
  display: block;
  margin-bottom: 20px;
  animation: bounce 1s ease infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.complete-content h2 {
  color: #333;
  font-size: 28px;
  margin-bottom: 15px;
}

.complete-content p {
  color: #666;
  font-size: 16px;
  margin-bottom: 10px;
}

.complete-actions {
  margin-top: 40px;
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
}
</style>
