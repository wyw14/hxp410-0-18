const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 41118;

const DATA_DIR = path.join(__dirname, 'data');
const SECRETS_FILE = path.join(DATA_DIR, 'secrets.json');

const TOPICS = {
  family: { label: '家庭亲情', icon: '👨‍👩‍👧' },
  friendship: { label: '友情交往', icon: '🤝' },
  love: { label: '爱情心事', icon: '💕' },
  work: { label: '工作职场', icon: '💼' },
  study: { label: '学业成长', icon: '📚' },
  self: { label: '自我反思', icon: '🌱' },
  other: { label: '其他', icon: '✨' }
};

const MOODS = {
  regret: { label: '愧疚后悔', icon: '😔', color: '#f59e0b' },
  sad: { label: '难过悲伤', icon: '😢', color: '#6366f1' },
  angry: { label: '愤怒不满', icon: '😠', color: '#ef4444' },
  confused: { label: '迷茫困惑', icon: '😕', color: '#8b5cf6' },
  relieved: { label: '如释重负', icon: '😌', color: '#10b981' },
  hopeful: { label: '充满希望', icon: '😊', color: '#ec4899' }
};

const DEFAULT_TOPIC = 'other';
const DEFAULT_MOOD = 'regret';
const DEFAULT_IS_PUBLIC = true;

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(SECRETS_FILE)) {
  fs.writeFileSync(SECRETS_FILE, JSON.stringify([]));
}

app.use(cors());
app.use(express.json());

function readRawSecrets() {
  const data = fs.readFileSync(SECRETS_FILE, 'utf8');
  return JSON.parse(data);
}

function readSecrets() {
  const secrets = readRawSecrets();
  return secrets.map(s => ({
    ...s,
    status: s.status || '已宽恕',
    topic: s.topic || DEFAULT_TOPIC,
    mood: s.mood || DEFAULT_MOOD,
    isPublic: s.isPublic !== undefined ? Boolean(s.isPublic) : DEFAULT_IS_PUBLIC
  }));
}

function writeSecrets(secrets) {
  fs.writeFileSync(SECRETS_FILE, JSON.stringify(secrets, null, 2));
}

function isSameLocalDay(dateStr, referenceDate) {
  const d = new Date(dateStr);
  const ref = referenceDate || new Date();
  return d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate();
}

function getLocalDayStart(date) {
  const d = date || new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

app.post('/api/secrets', (req, res) => {
  try {
    const { content, topic, mood, isPublic } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: '秘密内容不能为空' });
    }

    const validTopics = Object.keys(TOPICS);
    const validMoods = Object.keys(MOODS);

    const rawSecrets = readRawSecrets();
    const newSecret = {
      id: uuidv4(),
      content: content.trim(),
      status: '已宽恕',
      createdAt: new Date().toISOString(),
      topic: validTopics.includes(topic) ? topic : DEFAULT_TOPIC,
      mood: validMoods.includes(mood) ? mood : DEFAULT_MOOD,
      isPublic: isPublic !== undefined ? Boolean(isPublic) : DEFAULT_IS_PUBLIC
    };

    rawSecrets.push(newSecret);
    writeSecrets(rawSecrets);

    res.json({
      success: true,
      message: '你的秘密已被宽恕',
      secret: newSecret
    });
  } catch (error) {
    console.error('保存秘密时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/secrets/random', (req, res) => {
  try {
    const secrets = readSecrets();
    const forgivenSecrets = secrets.filter(s => s.status === '已宽恕' && s.isPublic);

    if (forgivenSecrets.length === 0) {
      return res.json({
        hasSecret: false,
        message: '还没有被宽恕的秘密，成为第一个分享的人吧'
      });
    }

    const randomIndex = Math.floor(Math.random() * forgivenSecrets.length);
    const randomSecret = forgivenSecrets[randomIndex];

    res.json({
      hasSecret: true,
      secret: {
        id: randomSecret.id,
        content: randomSecret.content,
        status: randomSecret.status
      }
    });
  } catch (error) {
    console.error('获取随机秘密时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const secrets = readSecrets();
    const now = new Date();

    const total = secrets.length;

    const todayCount = secrets.filter(s => isSameLocalDay(s.createdAt, now)).length;

    const publicCount = secrets.filter(s => s.isPublic).length;
    const publicRatio = total > 0 ? Math.round((publicCount / total) * 100) : 0;

    const topicDistribution = {};
    Object.keys(TOPICS).forEach(key => {
      topicDistribution[key] = {
        label: TOPICS[key].label,
        icon: TOPICS[key].icon,
        count: 0
      };
    });
    secrets.forEach(s => {
      const topicKey = TOPICS[s.topic] ? s.topic : DEFAULT_TOPIC;
      topicDistribution[topicKey].count++;
    });

    const moodDistribution = {};
    Object.keys(MOODS).forEach(key => {
      moodDistribution[key] = {
        label: MOODS[key].label,
        icon: MOODS[key].icon,
        color: MOODS[key].color,
        count: 0
      };
    });
    secrets.forEach(s => {
      const moodKey = MOODS[s.mood] ? s.mood : DEFAULT_MOOD;
      moodDistribution[moodKey].count++;
    });

    const last7Days = [];
    const dayLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    for (let i = 6; i >= 0; i--) {
      const dayDate = new Date(now);
      dayDate.setDate(dayDate.getDate() - i);
      const dayStart = getLocalDayStart(dayDate);
      const nextDayStart = new Date(dayStart);
      nextDayStart.setDate(nextDayStart.getDate() + 1);

      const dayCount = secrets.filter(s => {
        const t = new Date(s.createdAt);
        return t >= dayStart && t < nextDayStart;
      }).length;

      const isToday = i === 0;
      last7Days.push({
        date: `${dayDate.getMonth() + 1}/${dayDate.getDate()}`,
        day: dayLabels[dayDate.getDay()],
        count: dayCount,
        isToday
      });
    }

    res.json({
      total,
      todayCount,
      publicCount,
      publicRatio,
      topicDistribution,
      moodDistribution,
      last7Days
    });
  } catch (error) {
    console.error('获取统计数据时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`忏悔室后端服务运行在 http://localhost:${PORT}`);
});
