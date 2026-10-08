// Stopwords for electricity complaints
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'up', 'about', 'into', 'over', 'after', 'our', 'my', 'we', 'i', 'please', 'kindly', 'sir', 'madam',
  'this', 'that', 'there', 'here', 'complaint', 'issue', 'problem', 'facing', 'area', 'colony', 'near', 'road',
  'ye', 'hai', 'ka', 'ki', 'ke', 'aur', 'par', 'me', 'se', 'ko', 'karo', 'kripya', 'ahe', 'aahe', 'ani', 'var'
]);

// Tokenizer & Cleaner
export function cleanAndTokenize(text) {
  if (!text || typeof text !== 'string') return [];
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = normalized.split(' ');
  const unigrams = [];

  for (const word of words) {
    if (word && word.length > 2 && !STOPWORDS.has(word)) {
      unigrams.push(word);
    }
  }

  // Generate bigrams without mutating the array being iterated
  const bigrams = [];
  for (let i = 0; i < unigrams.length - 1; i++) {
    bigrams.push(`${unigrams[i]}_${unigrams[i + 1]}`);
  }

  return [...unigrams, ...bigrams];
}

export const ML_CATEGORY_MODEL = [
  { categoryId: 'cat_01', categoryName: 'Power Outage / No Supply', departmentId: 'dept_power_supply', departmentName: 'Power Supply & Operations', priorProbability: 0.15, weights: { outage: 5, blackout: 5, power: 3, supply: 3, electricity: 3, current: 3, bijli: 4, no_power: 5 } },
  { categoryId: 'cat_02', categoryName: 'Voltage Fluctuation / Low Voltage', departmentId: 'dept_power_supply', departmentName: 'Power Supply & Operations', priorProbability: 0.1, weights: { voltage: 5, fluctuation: 5, low_voltage: 5, flickering: 4, tripping: 3 } },
  { categoryId: 'cat_03', categoryName: 'Meter Issues', departmentId: 'dept_metering', departmentName: 'Metering & Technical Services', priorProbability: 0.1, weights: { meter: 5, reading: 4, faulty: 3, malfunction: 5, error: 3 } },
  { categoryId: 'cat_04', categoryName: 'Billing and Payment', departmentId: 'dept_billing', departmentName: 'Billing & Consumer Revenue', priorProbability: 0.1, weights: { bill: 5, billing: 5, payment: 4, tariff: 4, amount: 3, charges: 3 } },
  { categoryId: 'cat_05', categoryName: 'Transformer Fault', departmentId: 'dept_maintenance', departmentName: 'Transformer & Substation Maintenance', priorProbability: 0.1, weights: { transformer: 6, substation: 4, smoke: 4, noise: 3, feeder: 3 } },
  { categoryId: 'cat_06', categoryName: 'Pole / Wire / Electrical Hazard', departmentId: 'dept_safety', departmentName: 'Electrical Safety & Hazard Response', priorProbability: 0.1, weights: { pole: 4, wire: 5, live_wire: 7, exposed_wire: 7, sparking: 6, shock: 6, electrocution: 7, fire: 5 } },
  { categoryId: 'cat_07', categoryName: 'New Connection / Service Request', departmentId: 'dept_commercial', departmentName: 'New Connection & Commercial Services', priorProbability: 0.1, weights: { connection: 5, new_connection: 6, service: 3, load: 4, enhancement: 4 } },
  { categoryId: 'cat_08', categoryName: 'Street/Public Electrical Infrastructure', departmentId: 'dept_maintenance', departmentName: 'Transformer & Substation Maintenance', priorProbability: 0.08, weights: { streetlight: 5, public: 3, infrastructure: 4, lamp: 4, lighting: 4 } },
  { categoryId: 'cat_09', categoryName: 'Power Theft / Unauthorized Connection', departmentId: 'dept_commercial', departmentName: 'New Connection & Commercial Services', priorProbability: 0.07, weights: { theft: 6, unauthorized: 5, illegal: 4, connection: 3, bypass: 5 } },
  { categoryId: 'cat_10', categoryName: 'General Consumer Services', departmentId: 'dept_power_supply', departmentName: 'Power Supply & Operations', priorProbability: 0.1, weights: { request: 3, complaint: 2, information: 3, service: 2 } }
];

export function predictCategory(title, description, threshold = 0.80) {
  const combinedText = `${title} ${description}`;
  const tokens = cleanAndTokenize(combinedText);

  const rawScores = ML_CATEGORY_MODEL.map((cat) => {
    let score = Math.log(cat.priorProbability + 0.001);
    for (const token of tokens) {
      if (cat.weights[token]) {
        score += cat.weights[token];
      }
    }
    return { category: cat, score };
  });

  // Softmax normalization
  const maxScore = Math.max(...rawScores.map((s) => s.score));
  const expScores = rawScores.map((s) => ({
    ...s,
    exp: Math.exp(s.score - maxScore)
  }));
  const sumExp = expScores.reduce((acc, curr) => acc + curr.exp, 0);

  const normalized = expScores
    .map((s) => ({
      category: s.category,
      probability: Number((s.exp / sumExp).toFixed(3))
    }))
    .sort((a, b) => b.probability - a.probability);

  const best = normalized[0];
  const second = normalized[1];

  // Base fallback if no meaningful tokens matched
  const hasFeatures = tokens.some((t) =>
    ML_CATEGORY_MODEL.some((c) => c.weights[t] !== undefined)
  );

  const confidence = hasFeatures ? best.probability : 0.45;
  const isAutoRouted = confidence >= threshold;

  return {
    categoryId: best.category.categoryId,
    categoryName: best.category.categoryName,
    departmentId: best.category.departmentId,
    departmentName: best.category.departmentName,
    confidence,
    secondBestCategoryName: second?.category.categoryName,
    secondBestConfidence: second?.probability,
    allScores: normalized.map((n) => ({
      categoryName: n.category.categoryName,
      score: n.probability
    })),
    isAutoRouted
  };
}

// Duplicate Detection via TF-IDF Vector Cosine Similarity
export function calculateCosineSimilarity(text1, text2) {
  const tokens1 = cleanAndTokenize(text1);
  const tokens2 = cleanAndTokenize(text2);

  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  const freq1 = {};
  const freq2 = {};

  tokens1.forEach((t) => (freq1[t] = (freq1[t] || 0) + 1));
  tokens2.forEach((t) => (freq2[t] = (freq2[t] || 0) + 1));

  const allVocab = new Set([...Object.keys(freq1), ...Object.keys(freq2)]);
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  allVocab.forEach((term) => {
    const v1 = freq1[term] || 0;
    const v2 = freq2[term] || 0;
    dotProduct += v1 * v2;
    mag1 += v1 * v1;
    mag2 += v2 * v2;
  });

  const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
  if (magnitude === 0) return 0;

  return Number((dotProduct / magnitude).toFixed(3));
}

export function detectDuplicateComplaint(
  newTitle,
  newDesc,
  newWard,
  existingGrievances,
  threshold = 0.70
) {
  const newCombined = `${newTitle} ${newDesc}`;
  let highestScore = 0;
  let matchingGrievance;

  // Compare against active or recent grievances, prioritizing the same service area.
  const candidateGrievances = existingGrievances.filter(
    (g) => g.status !== 'CLOSED' && g.status !== 'RESOLVED'
  );

  for (const g of candidateGrievances) {
    const existingCombined = `${g.title} ${g.description}`;
    let score = calculateCosineSimilarity(newCombined, existingCombined);

    // Boost if in the same service area.
    const existingServiceArea = g.location?.serviceArea || g.location?.ward;
    if (existingServiceArea && newWard && existingServiceArea.toLowerCase() === newWard.toLowerCase()) {
      score = Math.min(1.0, score + 0.10);
    }

    if (score > highestScore) {
      highestScore = score;
      matchingGrievance = g;
    }
  }

  return {
    hasDuplicate: highestScore >= threshold,
    similarGrievanceId: matchingGrievance?.id,
    similarGrievanceNumber: matchingGrievance?.grievanceNumber,
    similarGrievanceTitle: matchingGrievance?.title,
    similarityScore: Number(highestScore.toFixed(3))
  };
}

// Rule-Based Priority Assessment Engine (Transparent, Explainable)
export function assessPriority(title, description, category) {
  const text = `${title} ${description}`.toLowerCase();

  // Critical Safety Triggers
  const criticalKeywords = [
    'live wire', 'exposed wire', 'dangling wire', 'electric shock', 'electrical shock',
    'sparking', 'fallen electric pole', 'high voltage wire', 'dangerous wire',
    'electrocution risk', 'transformer fire', 'burning transformer', 'fire hazard',
    'imminent danger'
  ];

  for (const keyword of criticalKeywords) {
    if (text.includes(keyword)) {
      return {
        priority: 'CRITICAL',
        reason: `Urgent public safety trigger detected: "${keyword}"`,
        source: 'RULE_BASED'
      };
    }
  }

  // High Priority Triggers
  const highKeywords = [
    'complete power outage', 'no electricity', 'no power', 'power failure',
    'feeder outage', 'transformer failure', 'major supply interruption'
  ];

  for (const keyword of highKeywords) {
    if (text.includes(keyword)) {
      return {
        priority: 'HIGH',
        reason: `Significant civic disruption trigger detected: "${keyword}"`,
        source: 'RULE_BASED'
      };
    }
  }

  // Category defaults & low-priority indicators.
  const lowKeywords = ['billing query', 'tariff query', 'bill clarification', 'general service request'];
  for (const keyword of lowKeywords) {
    if (text.includes(keyword)) {
      return {
        priority: 'LOW',
        reason: `Routine maintenance scope: "${keyword}"`,
        source: 'RULE_BASED'
      };
    }
  }

  return {
    priority: 'MEDIUM',
    reason: 'Standard electricity service queue based on complaint category',
    source: 'RULE_BASED'
  };
}

// Smart Officer Load Balancing & Assignment
export function assignOfficerToGrievance(departmentId, officers) {
  const eligibleOfficers = officers.filter(
    (u) =>
      u.role === 'OFFICER' &&
      u.isActive &&
      u.departmentId === departmentId &&
      (u.currentWorkload || 0) < (u.maxWorkload || 15)
  );

  if (eligibleOfficers.length === 0) {
    return {
      officerId: undefined,
      officerName: undefined,
      assignmentReason: 'All department officers are currently at maximum capacity or inactive. Marked for supervisor manual dispatch.'
    };
  }

  // Sort by lowest current workload
  eligibleOfficers.sort((a, b) => (a.currentWorkload || 0) - (b.currentWorkload || 0));
  const selected = eligibleOfficers[0];

  return {
    officerId: selected.id,
    officerName: selected.fullName,
    assignmentReason: `Auto-assigned to ${selected.fullName} (Current Load: ${selected.currentWorkload || 0}/${selected.maxWorkload || 15} cases) via least-workload load balancing.`
  };
}
