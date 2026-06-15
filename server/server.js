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

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(SECRETS_FILE)) {
  fs.writeFileSync(SECRETS_FILE, JSON.stringify([]));
}

app.use(cors());
app.use(express.json());

function readSecrets() {
  const data = fs.readFileSync(SECRETS_FILE, 'utf8');
  const secrets = JSON.parse(data);
  return secrets.map(s => ({
    id: s.id,
    content: s.content,
    status: s.status || '已宽恕',
    createdAt: s.createdAt,
    topic: s.topic || 'other',
    mood: s.mood || 'regret',
    isPublic: s.isPublic !== undefined ? s.isPublic : true
  }));
}

function writeSecrets(secrets) {
  fs.writeFileSync(SECRETS_FILE, JSON.stringify(secrets, null, 2));
}

function isSameDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

app.post('/api/secrets', (req, res) => {
  try {
    const { content, topic, mood, isPublic } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: '秘密内容不能为空' });
    }

    const validTopics = Object.keys(TOPICS);
    const validMoods = Object.keys(MOODS);

    const secrets = readSecrets();
    const newSecret = {
      id: uuidv4(),
      content: content.trim(),
      status: '已宽恕',
      createdAt: new Date().toISOString(),
      topic: validTopics.includes(topic) ? topic : 'other',
      mood: validMoods.includes(mood) ? mood : 'regret',
      isPublic: isPublic !== undefined ? Boolean(isPublic) : true
    };

    secrets.push(newSecret);
    writeSecrets(secrets);

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

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayCount = secrets.filter(s => new Date(s.createdAt) >= todayStart).length;

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
      if (topicDistribution[s.topic]) {
        topicDistribution[s.topic].count++;
      } else {
        topicDistribution.other.count++;
      }
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
      if (moodDistribution[s.mood]) {
        moodDistribution[s.mood].count++;
      } else {
        moodDistribution.regret.count++;
      }
    });

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      const dayCount = secrets.filter(s => {
        const t = new Date(s.createdAt);
        return t >= dayStart && t < dayEnd;
      }).length;
      const dayLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      last7Days.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        day: dayLabels[date.getDay()],
        count: dayCount
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
