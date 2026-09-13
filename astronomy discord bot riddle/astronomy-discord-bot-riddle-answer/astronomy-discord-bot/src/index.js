require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client, GatewayIntentBits, Partials, Events, REST, Routes,
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle
} = require('discord.js');
const { Chess } = require('chess.js');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
if (!token || !clientId) throw new Error('ضع DISCORD_TOKEN و DISCORD_CLIENT_ID في ملف .env');

const DATA_FILE = path.join(__dirname, '..', 'data.json');
let data = { scores: {}, events: [], locations: {}, alertChannels: {}, alertHistory: {}, houseScores: {} };
try { if (fs.existsSync(DATA_FILE)) data = { scores: {}, events: [], locations: {}, alertChannels: {}, alertHistory: {}, houseScores: {}, ...JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) }; } catch (e) { console.warn('تعذر قراءة data.json، سيتم البدء ببيانات جديدة.'); }
function saveData() { try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); } catch (e) { console.warn('تعذر حفظ البيانات:', e.message); } }

const facts = [
  'اليوم على كوكب الزهرة أطول من سنته حول الشمس.',
  'يوجد على المشتري عاصفة أكبر من حجم الأرض تُعرف بالبقعة الحمراء العظيمة.',
  'ضوء الشمس يحتاج نحو 8 دقائق و20 ثانية ليصل إلى الأرض.',
  'القمر يبتعد عن الأرض بمعدل يقارب 3.8 سم سنويًا.',
  'نجم القطب ليس ألمع نجم في السماء، لكنه مفيد لتحديد اتجاه الشمال.',
  'مجرة درب التبانة تحتوي على مئات المليارات من النجوم.'
];
const planets = {
  عطارد: 'أصغر كواكب المجموعة الشمسية وأقربها إلى الشمس، وسنته نحو 88 يومًا أرضيًا.',
  الزهرة: 'أشد كواكب المجموعة الشمسية حرارة بسبب غلافه الجوي الكثيف، ويدور بعكس معظم الكواكب.',
  الأرض: 'الكوكب المعروف بوجود الماء السائل والحياة، وله قمر طبيعي واحد.',
  المريخ: 'الكوكب الأحمر، وتوجد على سطحه براكين وأودية ضخمة وآثار لمياه قديمة.',
  المشتري: 'أكبر كواكب المجموعة الشمسية، وهو عملاق غازي وله عشرات الأقمار.',
  زحل: 'عملاق غازي مشهور بحلقاته الجليدية والصخرية الواسعة.',
  أورانوس: 'عملاق جليدي يميل محوره بشدة، لذلك يبدو كأنه يدور على جانبه.',
  نبتون: 'أبعد الكواكب الرئيسية عن الشمس وتتميز رياحه بسرعات هائلة.'
};
const quizzes = [
  { q: 'ما أكبر كواكب المجموعة الشمسية؟', a: 'المشتري', choices: ['عطارد', 'الأرض', 'المشتري', 'نبتون'] },
  { q: 'ما الكوكب المعروف بالكوكب الأحمر؟', a: 'المريخ', choices: ['الزهرة', 'المريخ', 'زحل', 'أورانوس'] },
  { q: 'كم عدد أقمار الأرض الطبيعية؟', a: 'واحد', choices: ['واحد', 'اثنان', 'أربعة', 'لا يوجد'] },
  { q: 'ما أقرب نجم إلى الأرض بعد الشمس؟', a: 'بروكسيما قنطورس', choices: ['الشعرى اليمانية', 'النسر الواقع', 'بروكسيما قنطورس', 'القطب'] }
];
const activeQuizzes = new Map();
const magicGames = new Map();
const planetGuessGames = new Map();
const skyMapGames = new Map();
const minuteGames = new Map();
const observationSessions = new Map();
const activeRiddles = new Map();

const zodiacMessages = {
  الحمل: 'نجمتك اليوم تشجعك على المبادرة؛ فرصة صغيرة قد تتحول إلى اكتشاف كبير.',
  الثور: 'طاقتك ثابتة مثل نجم القطب؛ ركّز على هدف واحد وستصل إليه.',
  الجوزاء: 'رسالة النجوم: اسأل وتعلّم، فاليوم مناسب لاكتشاف معلومة جديدة.',
  السرطان: 'القمر يذكّرك بأن الهدوء قوة؛ خذ وقتًا للتأمل قبل قرارك القادم.',
  الأسد: 'نورك واضح الليلة؛ شارك معرفتك مع الآخرين وستكسب حليفًا.',
  العذراء: 'دقّتك تشبه عمل عالم فلك؛ انتبه للتفاصيل الصغيرة فهي مفتاح اللغز.',
  الميزان: 'ابحث عن التوازن بين الحلم والخطة، فالنجوم تفتح الطريق لمن يستعد.',
  العقرب: 'حدسك قوي؛ راقب السماء بهدوء وقد تلاحظ ما يفوت الآخرين.',
  القوس: 'روح المغامرة تقودك إلى أفق جديد؛ جرّب سؤالًا فلكيًا لم تسأله من قبل.',
  الجدي: 'الصبر يصنع إنجازًا مداريًا؛ تقدّم خطوة واحدة اليوم.',
  الدلو: 'فكرة غير مألوفة قد تكون بداية اختراع رائع؛ لا تخف من اختلافك.',
  الحوت: 'خيالك واسع مثل سديم؛ حوّل حلمًا واحدًا إلى مشروع صغير.'
};
const magicalSigns = [
  ['عنقاء الشفق', 'شجاع، متجدد، وقدرتك السحرية هي النهوض بعد كل تحدٍ.'],
  ['ذئب القمر', 'وفيّ وحاد الملاحظة، وقدرتك هي قراءة اتجاهات النجوم.'],
  ['تنين السديم', 'طموح ومبدع، وقدرتك هي تحويل الأفكار إلى مغامرات.'],
  ['بومة المذنب', 'حكيم وفضولي، وقدرتك هي العثور على المعرفة المخفية.'],
  ['حورية الشفق', 'هادئ ومتوازن، وقدرتك هي تهدئة الفوضى من حولك.'],
  ['فارس النجم', 'منظم ومثابر، وقدرتك هي حماية فريقك في التحديات.']
];
const planetClues = [
  { name: 'المريخ', clues: ['لوني يميل إلى الأحمر.', 'لديّ قمران صغيران.', 'أملك أكبر بركان معروف في المجموعة الشمسية.'] },
  { name: 'زحل', clues: ['أنا عملاق غازي.', 'أشتهر بحلقاتي الجميلة.', 'لديّ عدد كبير من الأقمار.'] },
  { name: 'الزهرة', clues: ['أنا شديد الحرارة.', 'أدور بعكس معظم الكواكب.', 'غلافي الجوي كثيف جدًا.'] },
  { name: 'المشتري', clues: ['أنا أكبر كواكب المجموعة الشمسية.', 'لديّ بقعة حمراء عظيمة.', 'أنا عملاق غازي.'] },
  { name: 'نبتون', clues: ['أنا بعيد جدًا عن الشمس.', 'رياحي من الأسرع بين الكواكب.', 'لوني أزرق عميق.'] }
];
const skyMaps = [
  { name: 'الدب الأكبر', description: 'سبعة نجوم لامعة ترسم شكل مغرفة كبيرة، وتساعد على العثور على نجم القطب.' },
  { name: 'الجبار', description: 'كوكبة واضحة فيها ثلاثة نجوم مصطفة تقريبًا في حزام واحد، وتظهر فيها سديم شهير.' },
  { name: 'العقرب', description: 'كوكبة صيفية طويلة تشبه شكل العقرب وبالقرب منها نجم أحمر لامع.' },
  { name: 'ذات الكرسي', description: 'خمس نجوم لامعة تشكل شكل حرف W أو M في السماء الشمالية.' }
];
const minutePlanets = Object.entries(planets).map(([name, info]) => ({ name, info }));
const nightQuestions = [
  { q: 'ما الكوكب الأحمر؟', a: 'المريخ', choices: ['المريخ', 'الزهرة', 'نبتون'] },
  { q: 'ما أكبر كواكب المجموعة الشمسية؟', a: 'المشتري', choices: ['زحل', 'المشتري', 'الأرض'] },
  { q: 'ما الجسم الذي يدور حول الأرض؟', a: 'القمر', choices: ['القمر', 'الشمس', 'المذنب'] }
];
const riddleList = [
  { q: 'أظهر ليلًا وأختفي نهارًا، وأتغير من هلال إلى بدر. من أنا؟', a: 'القمر' },
  { q: 'ذيل مضيء أزور الشمس من بعيد، فمن أنا؟', a: 'المذنب' },
  { q: 'أنا نجم قريب يساعدك على معرفة الشمال. من أنا؟', a: 'نجم القطب' }
];
const archiveTexts = {
  الكواكب: 'أرشيف الكواكب: عطارد، الزهرة، الأرض، المريخ، المشتري، زحل، أورانوس، نبتون. استخدم /planet name:اسم الكوكب للتفاصيل.',
  النجوم: 'أرشيف النجوم: النجوم كرات غازية مضيئة، وتختلف ألوانها حسب درجة حرارتها. استخدم /fact لمعلومة عشوائية.',
  الأبراج: 'أرشيف الأبراج: لدينا أبراج خيالية مرتبطة بالنجوم. استخدم /magic-sign لمعرفة برجك السحري.',
  الأقمار: 'أرشيف الأقمار: القمر جسم طبيعي يدور حول كوكب أو كويكب. استخدم /moon لمعرفة طور قمر الأرض.',
  الظواهر: 'أرشيف الظواهر: الكسوف والخسوف وزخات الشهب والمذنبات من أجمل أحداث السماء. استخدم /space-events للمواعيد التقريبية.'
};

const astronomyEvents = [
  { name: 'زخة شهب الرباعيات', month: 1, day: 3 },
  { name: 'زخة شهب البرشاويات', month: 8, day: 12 },
  { name: 'زخة شهب التوأميات', month: 12, day: 14 },
  { name: 'الاعتدال الربيعي', month: 3, day: 20 },
  { name: 'الانقلاب الصيفي', month: 6, day: 21 },
  { name: 'الاعتدال الخريفي', month: 9, day: 22 },
  { name: 'الانقلاب الشتوي', month: 12, day: 21 }
];
function fmtDate(iso, timezone = 'UTC') { return new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(new Date(iso)); }
async function geocode(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ar&format=json`;
  const r = await fetch(url); if (!r.ok) throw new Error('تعذر الوصول إلى خدمة المواقع');
  const j = await r.json(); if (!j.results?.length) throw new Error('لم أجد هذه المدينة');
  const x = j.results[0]; return { city: x.name, country: x.country || '', latitude: x.latitude, longitude: x.longitude, timezone: x.timezone || 'auto' };
}
async function getSky(location) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&daily=sunrise,sunset&forecast_days=1&timezone=${encodeURIComponent(location.timezone)}`;
  const r = await fetch(url); if (!r.ok) throw new Error('تعذر جلب أوقات الشمس');
  const j = await r.json(); return { sunrise: j.daily.sunrise[0], sunset: j.daily.sunset[0], timezone: j.timezone };
}
async function getIss() {
  const r = await fetch('https://api.wheretheiss.at/v1/satellites/25544'); if (!r.ok) throw new Error('تعذر جلب موقع المحطة');
  return r.json();
}
function nextAstronomyEvents() {
  const now = new Date(), year = now.getUTCFullYear();
  return astronomyEvents.map(e => { let d = new Date(Date.UTC(year, e.month - 1, e.day)); if (d < now) d = new Date(Date.UTC(year + 1, e.month - 1, e.day)); return { ...e, date: d }; }).sort((a,b) => a.date - b.date);
}
function distanceDegrees(aLat, aLon, bLat, bLon) { const dLat = aLat - bLat, dLon = aLon - bLon; return Math.sqrt(dLat*dLat + dLon*dLon); }
async function checkAstronomyAlerts() {
  const now = new Date();
  data.alertHistory = data.alertHistory || {};
  for (const [channelId, cfg] of Object.entries(data.alertChannels || {})) {
    const channel = await client.channels.fetch(channelId).catch(() => null); if (!channel) continue;
    const events = nextAstronomyEvents().filter(e => e.date - now >= 0 && e.date - now < 86400000);
    for (const e of events) { const key = `${channelId}:${e.name}:${e.date.toISOString().slice(0,10)}`; if (!data.alertHistory[key]) { await channel.send(`تنبيه فلكي: **${e.name}** متوقع خلال 24 ساعة تقريبًا (التاريخ: ${e.date.toISOString().slice(0,10)}).`).catch(() => {}); data.alertHistory[key] = now.toISOString(); saveData(); } }
    if (cfg.location) {
      const iss = await getIss().catch(() => null);
      if (iss && distanceDegrees(cfg.location.latitude, cfg.location.longitude, Number(iss.latitude), Number(iss.longitude)) < 8) { const key = `${channelId}:iss:${new Date().toISOString().slice(0,13)}`; if (!data.alertHistory[key]) { await channel.send(`تنبيه: محطة الفضاء الدولية قريبة من موقع **${cfg.location.city}** الآن تقريبًا. الموقع الحالي: ${Number(iss.latitude).toFixed(2)}, ${Number(iss.longitude).toFixed(2)}.`).catch(() => {}); data.alertHistory[key] = now.toISOString(); saveData(); } }
    }
  }
}


function makeChoiceRow(prefix, choices) {
  return new ActionRowBuilder().addComponents(choices.map((choice, i) => new ButtonBuilder().setCustomId(`${prefix}:${i}`).setLabel(choice).setStyle(ButtonStyle.Primary)));
}
function randomItem(items) { return items[Math.floor(Math.random() * items.length)]; }

function renderMagicBoard(chess) {
  const symbols = { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚', P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔' };
  const lines = ['      a   b   c   d   e   f   g   h', '    ┌───┬───┬───┬───┬───┬───┬───┬───┐'];
  chess.board().forEach((row, i) => {
    const cells = row.map(piece => ` ${piece ? symbols[piece.color === 'w' ? piece.type.toUpperCase() : piece.type] : '·'} `);
    lines.push(`${8 - i}   │${cells.join('│')}│`);
    if (i < 7) lines.push('    ├───┼───┼───┼───┼───┼───┼───┼───┤');
  });
  lines.push('    └───┴───┴───┴───┴───┴───┴───┴───┘');
  return '```\n' + lines.join('\n') + '\n```\n♔ الأبيض: الساحر | ♚ الأسود: الساحر\n♙/♟ بيدق  ♖/♜ قلعة  ♘/♞ حصان  ♗/♝ فيل  ♕/♛ وزير  ♔/♚ ملك';
}
function moonPhase(date = new Date()) {
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14), synodic = 29.530588853;
  const age = ((date.getTime() - knownNewMoon) / 86400000) % synodic;
  const normalized = (age + synodic) % synodic;
  const phases = [['المحاق', 0], ['هلال متزايد', 1.84566], ['التربيع الأول', 5.53699], ['أحدب متزايد', 9.22831], ['البدر', 12.91963], ['أحدب متناقص', 16.61096], ['التربيع الأخير', 20.30228], ['هلال متناقص', 23.99361]];
  let closest = phases[0]; for (const phase of phases) if (Math.abs(normalized - phase[1]) < Math.abs(normalized - closest[1])) closest = phase;
  return `${closest[0]} — عمر القمر التقريبي ${normalized.toFixed(1)} يوم`;
}
function points(userId) { return Number(data.scores[userId] || 0); }
function addPoints(userId, amount) { data.scores[userId] = points(userId) + amount; saveData(); return data.scores[userId]; }
function addHousePoints(house, amount) { data.houseScores[house] = Number(data.houseScores[house] || 0) + amount; saveData(); return data.houseScores[house]; }
function normalizeText(value) { return String(value || '').trim().replace(/^برج\s+/, '').replace(/^قسم\s+/, ''); }
function levelFor(score) { if (score >= 100) return ['عالم فلك', 100]; if (score >= 50) return ['راصد متقدم', 50]; if (score >= 20) return ['راصد', 20]; return ['مستكشف الفضاء', 0]; }
async function applyAstronomyRole(member, score) {
  const [roleName] = levelFor(score);
  try {
    let role = member.guild.roles.cache.find(r => r.name === roleName);
    if (!role) role = await member.guild.roles.create({ name: roleName, reason: 'رتبة مستوى فلكية تلقائية' });
    const oldNames = ['مستكشف الفضاء', 'راصد', 'راصد متقدم', 'عالم فلك'];
    for (const old of member.roles.cache.filter(r => oldNames.includes(r.name)).values()) if (old.id !== role.id) await member.roles.remove(old).catch(() => {});
    await member.roles.add(role).catch(() => {});
  } catch (e) { console.warn('تعذر تحديث الرتبة:', e.message); }
}

const commands = [
  new SlashCommandBuilder().setName('help').setDescription('عرض أوامر بوت نادي الفلك'),
  new SlashCommandBuilder().setName('fact').setDescription('إرسال معلومة فلكية عشوائية'),
  new SlashCommandBuilder().setName('planet').setDescription('معلومات عن كوكب').addStringOption(o => o.setName('name').setDescription('اسم الكوكب').setRequired(true)),
  new SlashCommandBuilder().setName('moon').setDescription('عرض طور القمر الحالي'),
  new SlashCommandBuilder().setName('quiz').setDescription('بدء مسابقة فلكية تفاعلية'),
  new SlashCommandBuilder().setName('apod').setDescription('عرض صورة ناسا الفلكية اليومية'),
  new SlashCommandBuilder().setName('sky').setDescription('أوقات الشروق والغروب حسب المدينة').addStringOption(o => o.setName('city').setDescription('اسم المدينة').setRequired(true)),
  new SlashCommandBuilder().setName('iss').setDescription('عرض الموقع الحالي لمحطة الفضاء الدولية'),
  new SlashCommandBuilder().setName('space-events').setDescription('عرض أقرب زخات شهب ومواعيد فلكية'),
  new SlashCommandBuilder().setName('set-location').setDescription('حفظ مدينتك للتنبيهات').addStringOption(o => o.setName('city').setDescription('اسم المدينة').setRequired(true)),
  new SlashCommandBuilder().setName('alerts-on').setDescription('تفعيل التنبيهات الفلكية في هذه القناة'),
  new SlashCommandBuilder().setName('alerts-off').setDescription('إيقاف التنبيهات الفلكية في هذه القناة'),
  new SlashCommandBuilder().setName('magic-chess').setDescription('بدء مباراة شطرنج سحرية ضد عضو').addUserOption(o => o.setName('opponent').setDescription('الخصم').setRequired(true)),
  new SlashCommandBuilder().setName('magic-move').setDescription('تحريك قطعة في مباراة الشطرنج').addStringOption(o => o.setName('from').setDescription('المربع الحالي مثل e2').setRequired(true)).addStringOption(o => o.setName('to').setDescription('المربع الجديد مثل e4').setRequired(true)),
  new SlashCommandBuilder().setName('magic-board').setDescription('عرض لوحة الشطرنج السحرية الحالية'),
  new SlashCommandBuilder().setName('magic-resign').setDescription('الاستسلام في مباراة الشطرنج'),
  new SlashCommandBuilder().setName('star-fortune').setDescription('حظك من النجوم').addStringOption(o => o.setName('zodiac').setDescription('برجك التقليدي').setRequired(true)),
  new SlashCommandBuilder().setName('guess-planet').setDescription('خمن الكوكب من التلميحات'),
  new SlashCommandBuilder().setName('sky-map').setDescription('خمن مجموعة النجوم من الوصف'),
  new SlashCommandBuilder().setName('planet-minute').setDescription('كوكب في دقيقة'),
  new SlashCommandBuilder().setName('magic-sign').setDescription('اكتشف برجك السحري'),
  new SlashCommandBuilder().setName('observation-night').setDescription('بدء ليلة الرصد التفاعلية'),
  new SlashCommandBuilder().setName('meteor-comet').setDescription('نيزك أم مذنب؟'),
  new SlashCommandBuilder().setName('astro-riddle').setDescription('عرض لغز فلكي للإجابة عليه'),
  new SlashCommandBuilder().setName('astro-answer').setDescription('إرسال إجابتك على آخر لغز فلكي').addStringOption(o => o.setName('answer').setDescription('إجابتك').setRequired(true)),
  new SlashCommandBuilder().setName('astronomers-cup').setDescription('كأس علماء الفلك بين أربعة منازل'),
  new SlashCommandBuilder().setName('archive').setDescription('فتح قسم من أرشيف الفلك').addStringOption(o => o.setName('section').setDescription('القسم').setRequired(true)),
  new SlashCommandBuilder().setName('score').setDescription('عرض نقاطك ورتبتك'),
  new SlashCommandBuilder().setName('leaderboard').setDescription('عرض ترتيب الأعضاء بالنقاط'),
  new SlashCommandBuilder().setName('events').setDescription('عرض فعاليات النادي'),
  new SlashCommandBuilder().setName('event-add').setDescription('إضافة فعالية للنادي').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).addStringOption(o => o.setName('title').setDescription('اسم الفعالية').setRequired(true)).addStringOption(o => o.setName('date').setDescription('الموعد').setRequired(true)),
  new SlashCommandBuilder().setName('rules').setDescription('عرض قوانين النادي'),
  new SlashCommandBuilder().setName('warn').setDescription('تحذير عضو').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers).addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('السبب').setRequired(true)),
  new SlashCommandBuilder().setName('clear').setDescription('حذف رسائل').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages).addIntegerOption(o => o.setName('amount').setDescription('عدد الرسائل من 1 إلى 100').setMinValue(1).setMaxValue(100).setRequired(true))
].map(c => c.toJSON());

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers], partials: [Partials.GuildMember] });
const rest = new REST({ version: '10' }).setToken(token);
async function register() { await rest.put(Routes.applicationCommands(clientId), { body: commands }); console.log('تم تسجيل أوامر البوت.'); }

client.once(Events.ClientReady, c => console.log(`البوت متصل باسم ${c.user.tag}`));
client.on(Events.GuildMemberAdd, member => member.send(`أهلًا بك في نادي الفلك يا ${member.user.username}! استخدم /help للتعرف على الأوامر.`).catch(() => {}));
client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isButton()) {
      const parts = interaction.customId.split(':'), type = parts[0];
      if (['planetguess', 'skymap', 'phenomenon', 'cup', 'night'].includes(type)) {
        const id = parts[1], selected = interaction.component?.label || '';
        if (type === 'planetguess') { const game = planetGuessGames.get(id); if (!game || game.userId !== interaction.user.id) return interaction.reply({ content: 'هذه اللعبة ليست لك أو انتهت.', ephemeral: true }); planetGuessGames.delete(id); if (selected === game.answer) { const total = addPoints(interaction.user.id, 10); return interaction.update({ content: `إجابة صحيحة! الكوكب هو **${game.answer}** وحصلت على 10 نقاط. مجموعك: **${total}**.`, components: [] }); } return interaction.update({ content: `إجابة غير صحيحة. الكوكب هو **${game.answer}**.`, components: [] }); }
        if (type === 'skymap') { const game = skyMapGames.get(id); if (!game || game.userId !== interaction.user.id) return interaction.reply({ content: 'هذه اللعبة ليست لك أو انتهت.', ephemeral: true }); skyMapGames.delete(id); if (selected === game.answer) { const total = addPoints(interaction.user.id, 10); return interaction.update({ content: `أحسنت! هذه مجموعة **${game.answer}**. حصلت على 10 نقاط، مجموعك: **${total}**.`, components: [] }); } return interaction.update({ content: `ليست الإجابة الصحيحة. المجموعة هي **${game.answer}**.`, components: [] }); }
        if (type === 'phenomenon') { const game = observationSessions.get(`phenomenon:${id}`); if (!game || game.userId !== interaction.user.id) return interaction.reply({ content: 'هذا التحدي ليس لك أو انتهى.', ephemeral: true }); observationSessions.delete(`phenomenon:${id}`); if (selected === game.answer) { const total = addPoints(interaction.user.id, 10); return interaction.update({ content: `صحيح! إنها **${game.answer}**. حصلت على 10 نقاط، مجموعك: **${total}**.`, components: [] }); } return interaction.update({ content: `الإجابة الصحيحة: **${game.answer}**.`, components: [] }); }
        if (type === 'cup') { const game = observationSessions.get(`cup:${id}`); if (!game || game.userId !== interaction.user.id) return interaction.reply({ content: 'انتهت هذه الجولة أو ليست لك.', ephemeral: true }); observationSessions.delete(`cup:${id}`); addHousePoints(selected, 0); return interaction.update({ content: `تم تسجيلك في **${selected}**. أجب عن /quiz لجمع نقاط لدارك. نقاط المنازل الحالية: ${Object.entries(data.houseScores).map(([h,v]) => `${h}: ${v}`).join(' | ')}`, components: [] }); }
        if (type === 'night') { const key = `night:${interaction.guildId}`, game = observationSessions.get(key); if (!game || game.questionId !== id) return interaction.reply({ content: 'انتهت جولة ليلة الرصد.', ephemeral: true }); observationSessions.delete(key); if (selected === game.answer) { const total = addPoints(interaction.user.id, 1); return interaction.update({ content: `إجابة صحيحة! حصلت على نقطة في ليلة الرصد. مجموعك: **${total}**.`, components: [] }); } return interaction.update({ content: `انتهت الجولة. الإجابة الصحيحة: **${game.answer}**.`, components: [] }); }
      }
      const [legacyType, answer, quizId] = interaction.customId.split(':');
      if (legacyType !== 'quiz') return;
      const quiz = activeQuizzes.get(quizId);
      if (!quiz) return interaction.reply({ content: 'انتهت هذه المسابقة، ابدأ مسابقة جديدة عبر /quiz.', ephemeral: true });
      if (quiz.userId !== interaction.user.id) return interaction.reply({ content: 'هذه المسابقة تخص عضوًا آخر.', ephemeral: true });
      activeQuizzes.delete(quizId);
      const chosen = quiz.choices[Number(answer)], correct = chosen === quiz.answer;
      if (correct) {
        const total = addPoints(interaction.user.id, 10); await applyAstronomyRole(interaction.member, total);
        return interaction.update({ content: `إجابة صحيحة! حصلت على **10 نقاط**. مجموعك: **${total}** نقطة.`, components: [] });
      }
      return interaction.update({ content: `إجابة غير صحيحة. الإجابة الصحيحة هي **${quiz.answer}**. مجموعك: **${points(interaction.user.id)}** نقطة.`, components: [] });
    }
    if (!interaction.isChatInputCommand()) return;
    const name = interaction.commandName;
    if (name === 'help') return interaction.reply('أوامر الفلك: /fact، /planet، /moon، /quiz، /apod، /score، /leaderboard، /events، /rules، /sky، /iss، /space-events، /set-location، /alerts-on، /alerts-off. الألعاب: /magic-chess، /magic-move، /magic-board، /magic-resign، /star-fortune، /guess-planet، /sky-map، /planet-minute، /magic-sign، /observation-night، /meteor-comet، /astro-riddle، /astronomers-cup، /archive. للمشرفين: /event-add، /warn، /clear.');
    if (name === 'fact') return interaction.reply(`**معلومة فلكية:** ${facts[Math.floor(Math.random() * facts.length)]}`);
    if (name === 'planet') { const key = interaction.options.getString('name').trim().toLowerCase(); const found = Object.keys(planets).find(p => p.toLowerCase() === key); return interaction.reply(found ? `**${found}:** ${planets[found]}` : `لم أجد هذا الكوكب. اختر: ${Object.keys(planets).join('، ')}`); }
    if (name === 'moon') return interaction.reply(`طور القمر الآن: **${moonPhase()}**`);
    if (name === 'quiz') {
      const item = quizzes[Math.floor(Math.random() * quizzes.length)], quizId = `${interaction.id}`;
      activeQuizzes.set(quizId, { userId: interaction.user.id, answer: item.a, choices: item.choices });
      const row = new ActionRowBuilder().addComponents(item.choices.map((choice, i) => new ButtonBuilder().setCustomId(`quiz:${i}:${quizId}`).setLabel(choice).setStyle(ButtonStyle.Primary)));
      return interaction.reply({ content: `**مسابقة فلكية**\n${item.q}\nاختر الإجابة الصحيحة:`, components: [row] });
    }
    if (name === 'magic-chess') {
      const opponent = interaction.options.getUser('opponent');
      if (opponent.bot || opponent.id === interaction.user.id) return interaction.reply({ content: 'اختر عضوًا آخر وليس بوتًا.', ephemeral: true });
      const existing = [...magicGames.values()].find(g => g.players.includes(interaction.user.id) || g.players.includes(opponent.id));
      if (existing) return interaction.reply({ content: 'أحد اللاعبين لديه مباراة نشطة بالفعل.', ephemeral: true });
      const game = new Chess(), id = `${interaction.guildId}:${interaction.channelId}:${Date.now()}`;
      magicGames.set(id, { id, chess: game, players: [interaction.user.id, opponent.id], white: interaction.user.id, black: opponent.id, channelId: interaction.channelId });
      return interaction.reply(`بدأت مباراة الشطرنج السحرية!\nالأبيض: <@${interaction.user.id}>\nالأسود: <@${opponent.id}>\nالدور الآن: <@${interaction.user.id}>\n\n${renderMagicBoard(game)}\nاستخدم /magic-move from:e2 to:e4`);
    }
    if (name === 'magic-board') {
      const game = [...magicGames.values()].find(g => g.channelId === interaction.channelId && g.players.includes(interaction.user.id));
      if (!game) return interaction.reply({ content: 'لا توجد لك مباراة نشطة في هذه القناة.', ephemeral: true });
      return interaction.reply(`${renderMagicBoard(game.chess)}\nالدور الآن: <@${game.chess.turn() === 'w' ? game.white : game.black}>\nاستخدم: /magic-move from:e2 to:e4`);
    }
    if (name === 'magic-move') {
      const game = [...magicGames.values()].find(g => g.channelId === interaction.channelId && g.players.includes(interaction.user.id));
      if (!game) return interaction.reply({ content: 'لا توجد لك مباراة نشطة في هذه القناة. ابدأ عبر /magic-chess.', ephemeral: true });
      const expected = game.chess.turn() === 'w' ? game.white : game.black;
      if (interaction.user.id !== expected) return interaction.reply({ content: 'ليس دورك الآن.', ephemeral: true });
      try {
        const move = game.chess.move({ from: interaction.options.getString('from').toLowerCase(), to: interaction.options.getString('to').toLowerCase(), promotion: 'q' });
        let result = `تمت الحركة: **${move.san}**\n\n${renderMagicBoard(game.chess)}`;
        if (game.chess.isCheckmate()) { result += `\n\nكش مات! الفائز: <@${interaction.user.id}>`; magicGames.delete(game.id); }
        else if (game.chess.isDraw() || game.chess.isStalemate()) { result += '\n\nتعادل!'; magicGames.delete(game.id); }
        else result += `\n\nالدور الآن: <@${game.chess.turn() === 'w' ? game.white : game.black}>`;
        return interaction.reply(result);
      } catch (e) { return interaction.reply({ content: 'حركة غير قانونية. استخدم صيغة مثل from:e2 وto:e4 وتأكد أن القطعة لك.', ephemeral: true }); }
    }
    if (name === 'magic-resign') {
      const game = [...magicGames.values()].find(g => g.channelId === interaction.channelId && g.players.includes(interaction.user.id));
      if (!game) return interaction.reply({ content: 'لا توجد لك مباراة نشطة.', ephemeral: true });
      const winner = game.players.find(id => id !== interaction.user.id); magicGames.delete(game.id); return interaction.reply(`<@${interaction.user.id}> استسلم. الفائز هو <@${winner}>!`);
    }
    if (name === 'star-fortune') {
      const zodiac = normalizeText(interaction.options.getString('zodiac')); const message = zodiacMessages[zodiac] || randomItem(Object.values(zodiacMessages));
      return interaction.reply(`**حظك من النجوم — ${zodiac}**\n${message}\n\nهذه رسالة ترفيهية مستوحاة من النجوم.`);
    }
    if (name === 'guess-planet') {
      const item = randomItem(planetClues), id = interaction.id; planetGuessGames.set(id, { userId: interaction.user.id, answer: item.name });
      return interaction.reply({ content: `**خمن الكوكب!**\n• ${item.clues.join('\n• ')}\nاختر الإجابة:`, components: [makeChoiceRow(`planetguess:${id}`, ['المريخ','الزهرة','المشتري','زحل','نبتون'])] });
    }
    if (name === 'sky-map') {
      const item = randomItem(skyMaps), id = interaction.id; skyMapGames.set(id, { userId: interaction.user.id, answer: item.name });
      return interaction.reply({ content: `**خريطة السماء — خمن المجموعة**\n${item.description}\n\nاختر الاسم الصحيح:`, components: [makeChoiceRow(`skymap:${id}`, skyMaps.map(x => x.name))] });
    }
    if (name === 'planet-minute') {
      const item = randomItem(minutePlanets); return interaction.reply(`**كوكب في دقيقة**\n🌌 الكوكب: **${item.name}**\nمعلومة: ${item.info}`);
    }
    if (name === 'magic-sign') { const [name, traits] = randomItem(magicalSigns); return interaction.reply(`**برجك السحري: ${name}**\n${traits}`); }
    if (name === 'meteor-comet') {
      const item = randomItem([{ d: 'جسم جليدي يقترب من الشمس ويظهر له ذيل مضيء.', a: 'مذنب' }, { d: 'جسم صخري صغير يحترق عند دخوله الغلاف الجوي ويظهر كشهاب لامع.', a: 'نيزك' }]);
      const id = interaction.id; observationSessions.set(`phenomenon:${id}`, { userId: interaction.user.id, answer: item.a });
      return interaction.reply({ content: `**نيزك أم مذنب؟**\n${item.d}`, components: [makeChoiceRow(`phenomenon:${id}`, ['نيزك','مذنب'])] });
    }
    if (name === 'astro-riddle') { const item = randomItem(riddleList); activeRiddles.set(interaction.user.id, { answer: item.a, question: item.q, createdAt: Date.now() }); return interaction.reply(`**لغز الفلك**\n${item.q}\n\nأرسل إجابتك باستخدام: /astro-answer answer:إجابتك`); }
    if (name === 'astro-answer') { const riddle = activeRiddles.get(interaction.user.id); if (!riddle) return interaction.reply({ content: 'لا يوجد لغز محفوظ لك. ابدأ أولًا باستخدام /astro-riddle.', ephemeral: true }); const answer = interaction.options.getString('answer').trim().toLowerCase(); const correct = answer === riddle.answer.toLowerCase() || (riddle.answer === 'نجم القطب' && answer.includes('القطب')); activeRiddles.delete(interaction.user.id); if (correct) { const total = addPoints(interaction.user.id, 10); return interaction.reply(`إجابة صحيحة! حصلت على **10 نقاط**. مجموعك: **${total}**.`); } return interaction.reply(`ليست الإجابة الصحيحة. حاول مرة أخرى باستخدام /astro-riddle للغز جديد.`); }
    if (name === 'archive') {
      const section = normalizeText(interaction.options.getString('section')); const key = Object.keys(archiveTexts).find(k => section.includes(k) || k.includes(section));
      return interaction.reply(key ? `**أرشيف الفلك — ${key}**\n${archiveTexts[key]}` : `الأقسام المتاحة: ${Object.keys(archiveTexts).join('، ')}`);
    }
    if (name === 'astronomers-cup') {
      const houses = ['دار السديم', 'دار النجم القطبي', 'دار الشهاب', 'دار القمر'];
      const house = randomItem(houses); const id = interaction.id; observationSessions.set(`cup:${id}`, { userId: interaction.user.id, house });
      return interaction.reply({ content: `**كأس علماء الفلك**\nاختر دارك:`, components: [makeChoiceRow(`cup:${id}`, houses)] });
    }
    if (name === 'observation-night') {
      if (observationSessions.has(`night:${interaction.guildId}`)) return interaction.reply({ content: 'ليلة الرصد جارية بالفعل في هذا السيرفر.', ephemeral: true });
      const q = randomItem(nightQuestions), id = interaction.id; observationSessions.set(`night:${interaction.guildId}`, { userId: interaction.user.id, answer: q.a, questionId: id, points: 0 });
      return interaction.reply({ content: `**ليلة الرصد بدأت!**\n${q.q}`, components: [makeChoiceRow(`night:${id}`, q.choices)] });
    }
    if (name === 'sky') {
      await interaction.deferReply();
      const loc = await geocode(interaction.options.getString('city')), sky = await getSky(loc);
      return interaction.editReply(`**${loc.city}${loc.country ? `، ${loc.country}` : ''}**\nالشروق: **${fmtDate(sky.sunrise, sky.timezone)}**\nالغروب: **${fmtDate(sky.sunset, sky.timezone)}**\nنصيحة رصد: أفضل وقت للنجوم عادةً بعد الغروب بساعة وحتى قبل الفجر، مع الابتعاد عن إضاءة المدينة.`);
    }
    if (name === 'iss') {
      await interaction.deferReply(); const iss = await getIss();
      return interaction.editReply(`موقع محطة الفضاء الدولية الآن تقريبًا:\nخط العرض: **${Number(iss.latitude).toFixed(2)}**\nخط الطول: **${Number(iss.longitude).toFixed(2)}**\nالارتفاع: **${Number(iss.altitude).toFixed(0)} كم**\nالسرعة: **${Number(iss.velocity).toFixed(0)} كم/ساعة**`);
    }
    if (name === 'space-events') {
      return interaction.reply(nextAstronomyEvents().slice(0, 5).map(e => `• **${e.name}** — ${e.date.toISOString().slice(0,10)}`).join('\n'));
    }
    if (name === 'set-location') {
      await interaction.deferReply({ ephemeral: true }); const loc = await geocode(interaction.options.getString('city'));
      data.locations[interaction.user.id] = loc; saveData(); return interaction.editReply(`تم حفظ موقعك: **${loc.city}**. استخدم /alerts-on لتفعيل التنبيهات في هذه القناة.`);
    }
    if (name === 'alerts-on') {
      const loc = data.locations[interaction.user.id]; if (!loc) return interaction.reply({ content: 'استخدم /set-location city:اسم_مدينتك أولًا.', ephemeral: true });
      data.alertChannels[interaction.channelId] = { location: loc, enabledAt: new Date().toISOString() }; saveData();
      return interaction.reply('تم تفعيل التنبيهات في هذه القناة. استخدم /alerts-off لإيقافها.');
    }
    if (name === 'alerts-off') { delete data.alertChannels[interaction.channelId]; saveData(); return interaction.reply('تم إيقاف التنبيهات في هذه القناة.'); }
    if (name === 'apod') {
      await interaction.deferReply();
      const key = process.env.NASA_API_KEY || 'DEMO_KEY';
      const response = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(key)}`);
      if (!response.ok) throw new Error(`NASA API ${response.status}`);
      const apod = await response.json();
      const embed = new EmbedBuilder().setTitle(`صورة ناسا الفلكية: ${apod.title}`).setDescription(apod.explanation?.slice(0, 4000) || '').setColor(0x1d4ed8).setFooter({ text: `NASA APOD — ${apod.date}` });
      if (apod.media_type === 'image') embed.setImage(apod.url); else embed.setURL(apod.url).addFields({ name: 'رابط الفيديو', value: apod.url });
      return interaction.editReply({ embeds: [embed] });
    }
    if (name === 'score') { const total = points(interaction.user.id), [role] = levelFor(total); return interaction.reply(`نقاطك: **${total}** — رتبتك: **${role}**`); }
    if (name === 'leaderboard') { const rows = Object.entries(data.scores).sort((a,b) => b[1] - a[1]).slice(0, 10); return interaction.reply(rows.length ? rows.map((r,i) => `${i+1}. <@${r[0]}> — ${r[1]} نقطة`).join('\n') : 'لا توجد نقاط مسجلة بعد.'); }
    if (name === 'astronomers-cup') return interaction.reply(`**ترتيب المنازل**\n${Object.entries(data.houseScores || {}).sort((a,b) => b[1] - a[1]).map(([h,v],i) => `${i+1}. ${h} — ${v} نقطة`).join('\n') || 'لا توجد نقاط للمنازل بعد.'}`);
    if (name === 'events') return interaction.reply(data.events.length ? data.events.map((e,i) => `${i+1}. **${e.title}** — ${e.date}`).join('\n') : 'لا توجد فعاليات مضافة حاليًا.');
    if (name === 'event-add') { const title = interaction.options.getString('title'), date = interaction.options.getString('date'); data.events.push({ title, date }); saveData(); return interaction.reply(`تمت إضافة الفعالية: **${title}** — ${date}`); }
    if (name === 'rules') return interaction.reply('قوانين النادي: الاحترام المتبادل، منع الإزعاج والسبام، مشاركة معلومات موثوقة، وعدم نشر محتوى مخالف أو مسيء.');
    if (name === 'warn') { const member = interaction.options.getMember('member'), reason = interaction.options.getString('reason'); await member.send(`تم تحذيرك في السيرفر بسبب: ${reason}`).catch(() => {}); return interaction.reply(`تم تحذير ${member}. السبب: ${reason}`); }
    if (name === 'clear') { const amount = interaction.options.getInteger('amount'), deleted = await interaction.channel.bulkDelete(amount, true); return interaction.reply({ content: `تم حذف ${deleted.size} رسالة.`, ephemeral: true }); }
  } catch (err) { console.error(err); if (interaction.deferred) await interaction.editReply('حدث خطأ أثناء تنفيذ الأمر.').catch(() => {}); else if (!interaction.replied) await interaction.reply({ content: 'حدث خطأ أثناء تنفيذ الأمر.', ephemeral: true }).catch(() => {}); }
});

register().then(() => client.login(token)).then(() => { setInterval(checkAstronomyAlerts, 60 * 60 * 1000); });
