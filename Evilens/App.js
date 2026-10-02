import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
  Dimensions,
  Animated,
  Easing,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import axios from 'axios';
import Svg, { Polygon, Text as SvgText, Circle } from 'react-native-svg';

const windowWidth = Dimensions.get('window').width;

// Fixed verdict bands (single source of truth)
const VERDICTS = [
  'Fact / Strong Evidence',
  'Debatable / Few Evidence',
  'Observation / Weak Evidence',
  'Fabricated / No Evidence',
  'Hypothetical Theory',
];

// Palette (matches order above)
const COLORS = ['#4CAF50', '#FFC107', '#FF9800', '#F44336', '#9C27B0'];

// AI Models configuration
const AI_MODELS = {
  'gemini': 'Gemini',
  'gpt-5-nano': 'GPT-5 Nano',
  'llama-fast-roblox': 'Llama Fast Roblox'
};

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function App() {
  // UI state
  const [claim, setClaim] = useState('');
  const [result, setResult] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isQuestion, setIsQuestion] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini');

  // Cooldown (~1 req per 3s)
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownTimerRef = useRef(null);

  // Enhanced animations
  const buttonScale = useRef(new Animated.Value(1)).current;
  const triangleOpacity = useRef(new Animated.Value(0)).current;
  const triangleScale = useRef(new Animated.Value(0.96)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const resultTranslateY = useRef(new Animated.Value(18)).current;
  const inputScale = useRef(new Animated.Value(1)).current;
  const titleOpacity = useRef(new Animated.Value(1)).current;

  // Loading animation refs
  const loadingRotation = useRef(new Animated.Value(0)).current;

  // Pollinations API
  const POLL_TOKEN = 'removed temporarily for review';
  const POLL_URL = 'https://text.pollinations.ai/openai?token=I-9QBzUGMvlGdnLD';

  // -------- Enhanced AI Model Selection Logic --------
  const selectOptimalModel = (claimText) => {
    const text = claimText.toLowerCase().trim();
    
    // Complex reasoning indicators (favor GPT-5 Nano)
    const reasoningPatterns = [
      // Causal relationships
      /\b(because|therefore|thus|hence|consequently|as a result|leads to|causes|due to|since)\b/,
      // Statistical/research language
      /\b(study|research|data|statistics|correlation|experiment|survey|analysis|evidence|proof|findings)\b/,
      // Mathematical/scientific concepts
      /\b(percent|percentage|\d+%|coefficient|variable|hypothesis|theorem|formula|equation|probability)\b/,
      // Logical connectors
      /\b(if.*then|implies|suggests|indicates|demonstrates|shows that|proves that|given that)\b/,
      // Comparative analysis
      /\b(compared to|versus|vs|rather than|instead of|more likely|less likely|correlation|causation)\b/,
      // Scientific methodology
      /\b(peer.?reviewed|meta.?analysis|clinical trial|systematic review|controlled study)\b/
    ];

    // Philosophical/nuanced topics (favor Llama Fast Roblox)
    const philosophicalPatterns = [
      // Ethical/moral language
      /\b(should|ought|moral|ethical|right|wrong|justice|fair|unfair|good|bad|better|worse|virtue)\b/,
      // Belief/opinion language
      /\b(believe|think|feel|opinion|view|perspective|consider|assume|suppose|imagine)\b/,
      // Abstract concepts
      /\b(meaning|purpose|consciousness|existence|reality|truth|beauty|love|freedom|happiness|wisdom)\b/,
      // Social/cultural topics
      /\b(society|culture|tradition|religion|philosophy|values|beliefs|principles|ideology|worldview)\b/,
      // Subjective qualifiers
      /\b(probably|likely|possibly|perhaps|seems|appears|might|could|may|tend to|generally)\b/,
      // Philosophical questions
      /\b(why|how should|what is the meaning|is it right|morally|ethically)\b/
    ];

    // Factual verification indicators (favor Gemini)
    const factualPatterns = [
      // Time/date references
      /\b(when|where|who|what|happened|date|year|time|\d{4}|today|yesterday|recently|currently|ago)\b/,
      // Specific entities
      /\b(company|organization|country|city|person|celebrity|politician|president|CEO|founded|established)\b/,
      // News/events
      /\b(news|event|announcement|launched|released|reported|confirmed|denied|according to|sources)\b/,
      // Definitions/facts
      /\b(is|are|was|were|definition|means|refers to|known as|called|named|located|born|died)\b/,
      // Verification language
      /\b(true|false|fact|fiction|real|fake|authentic|genuine|accurate|correct|verify|check)\b/,
      // Quantitative facts
      /\b(population|size|height|weight|distance|temperature|speed|cost|price|number of)\b/
    ];

    // Count pattern matches with weighted scoring
    let reasoningScore = 0;
    let philosophicalScore = 0;
    let factualScore = 0;

    reasoningPatterns.forEach(pattern => {
      const matches = (text.match(pattern) || []).length;
      reasoningScore += matches;
    });
    
    philosophicalPatterns.forEach(pattern => {
      const matches = (text.match(pattern) || []).length;
      philosophicalScore += matches;
    });
    
    factualPatterns.forEach(pattern => {
      const matches = (text.match(pattern) || []).length;
      factualScore += matches;
    });

    // Additional context scoring
    const wordCount = text.split(/\s+/).length;
    const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const hasNumbers = /\d/.test(text);
    const hasQuestionMark = text.includes('?');
    const hasMultipleClauses = sentenceCount > 2 || text.includes(',') || text.includes(';');
    const hasQuotes = text.includes('"') || text.includes("'");

    // Boost scores based on complexity and context
    if (wordCount > 50 && hasMultipleClauses) reasoningScore += 2;
    if (hasNumbers && reasoningScore > 0) reasoningScore += 1;
    if (hasQuestionMark && factualScore > 0) factualScore += 1;
    if (hasQuotes && philosophicalScore > 0) philosophicalScore += 1;
    if (wordCount > 30 && philosophicalScore > 0) philosophicalScore += 1;

    // Clear decision logic with minimum thresholds
    const totalScore = reasoningScore + philosophicalScore + factualScore;
    
    if (totalScore === 0) {
      // No clear indicators, use heuristics
      if (hasQuestionMark || wordCount < 10) return 'gemini';
      if (wordCount > 40 && hasMultipleClauses) return 'gpt-5-nano';
      return 'gemini';
    }

    // Decision based on highest score with minimum threshold
    if (reasoningScore >= 2 && reasoningScore >= philosophicalScore && reasoningScore >= factualScore) {
      return 'gpt-5-nano';
    } else if (philosophicalScore >= 2 && philosophicalScore > factualScore) {
      return 'llama-fast-roblox';
    } else {
      // Default to Gemini for factual verification and simple claims
      return 'gemini';
    }
  };

  // -------- Professional Animations --------
  const startLoadingAnimation = () => {
    const rotationAnimation = Animated.loop(
      Animated.timing(loadingRotation, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    rotationAnimation.start();
  };

  const stopLoadingAnimation = () => {
    loadingRotation.stopAnimation();
    loadingRotation.setValue(0);
  };

  const animateInputFocus = () => {
    Animated.spring(inputScale, {
      toValue: 1.01,
      friction: 10,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const animateInputBlur = () => {
    Animated.spring(inputScale, {
      toValue: 1,
      friction: 10,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  // -------- Helpers --------
  const minimalGateAlllow = (text) => {
    if (!text) return false;
    const tRaw = text.trim();
    if (!tRaw) return false;
    const t = tRaw.toLowerCase().replace(/[!?.,]+$/g, '').trim();

    const greetings = new Set([
      'hi', 'hello', 'hey', 'yo', 'sup', 'greetings',
      'good morning', 'good afternoon', 'good evening', 'good night'
    ]);
    if (greetings.has(t)) return false;

    if (t.split(/\s+/).length < 2) return false;

    return true;
  };

  const startCooldown = () => {
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    setCooldownRemaining(3);
    cooldownTimerRef.current = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  const animateButtonPress = () => {
    Animated.sequence([
      Animated.timing(buttonScale, { 
        toValue: 0.96, 
        duration: 80, 
        easing: Easing.out(Easing.quad), 
        useNativeDriver: true 
      }),
      Animated.spring(buttonScale, { 
        toValue: 1, 
        friction: 6, 
        tension: 120, 
        useNativeDriver: true 
      }),
    ]).start();
  };

  const animateTriangleIn = () => {
    triangleOpacity.setValue(0);
    triangleScale.setValue(0.98);
    Animated.parallel([
      Animated.timing(triangleOpacity, { 
        toValue: 1, 
        duration: 500, 
        easing: Easing.out(Easing.quad), 
        useNativeDriver: true 
      }),
      Animated.spring(triangleScale, { 
        toValue: 1, 
        friction: 8, 
        tension: 100, 
        useNativeDriver: true 
      }),
    ]).start();
  };

  const animateResultIn = () => {
    resultOpacity.setValue(0);
    resultTranslateY.setValue(20);
    Animated.parallel([
      Animated.timing(resultOpacity, { 
        toValue: 1, 
        duration: 400, 
        easing: Easing.out(Easing.quad), 
        useNativeDriver: true 
      }),
      Animated.timing(resultTranslateY, { 
        toValue: 0, 
        duration: 400, 
        easing: Easing.out(Easing.quad), 
        useNativeDriver: true 
      }),
    ]).start();
  };

  // Robust verdict mapping
  const normalizeVerdict = (text) => {
    const t = (text || '').toLowerCase();

    for (let i = 0; i < VERDICTS.length; i++) {
      if (t === VERDICTS[i].toLowerCase()) return VERDICTS[i];
    }

    if (/\bfact\b/.test(t) || /strong evidence/.test(t) || /\btrue\b/.test(t)) {
      return VERDICTS[0];
    }
    if (/debatable|mixed|contested|few evidence|some evidence/.test(t)) {
      return VERDICTS[1];
    }
    if (/observation|weak evidence|anecdotal|limited/.test(t)) {
      return VERDICTS[2];
    }
    if (/fabricated|false|no evidence|misleading|hoax|myth/.test(t)) {
      return VERDICTS[3];
    }
    if (/hypothetical|theory|speculative|conjecture|assumption/.test(t)) {
      return VERDICTS[4];
    }

    if (/not a claim|not verifiable|question/.test(t)) {
      return 'Not a Claim';
    }

    return VERDICTS[2];
  };

  const verdictIndex = (verdict) => VERDICTS.findIndex(v => v === verdict);

  // -------- Core Analysis Logic --------
  const analyzeClaim = async () => {
    if (!claim.trim()) {
      setError('Please enter a claim to analyze');
      return;
    }
    if (cooldownRemaining > 0) {
      Alert.alert('Cooldown active', `Please wait ${cooldownRemaining}s before the next analysis.`);
      return;
    }

    animateButtonPress();

    // Select optimal model with enhanced logic
    const optimalModel = selectOptimalModel(claim);
    setSelectedModel(optimalModel);

    const allow = minimalGateAlllow(claim);
    if (!allow) {
      setIsQuestion(true);
      setError('');
      const r = {
        verdict: 'Not a Claim',
        explanation: 'Your input does not appear to be a verifiable claim or theory.',
        evidence: 'Claims suggest or deny an idea that can be evaluated as true or false.',
        source: 'Rephrase as a factual or theoretical statement for verification.',
      };
      setResult(r);
      setExpanded(true);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      animateTriangleIn();
      animateResultIn();
      startCooldown();
      return;
    }
    setIsQuestion(false);

    try {
      setLoading(true);
      setError('');
      setResult(null);
      startLoadingAnimation();

      // Subtle title animation
      Animated.timing(titleOpacity, {
        toValue: 0.7,
        duration: 200,
        useNativeDriver: true,
      }).start();

      const systemMsg = `
You are a claim verification and classification system. Your job is to evaluate claims or theories strictly based on available evidence, logical reasoning, and the principle of uncertainty.

**Core Principles:**
1. Accuracy, fairness, and avoiding overconfidence are your top priorities.
2. Lack of evidence does not prove something is false; absence of disproof does not prove something is true.
3. If a claim is unfalsifiable, speculative, or belief-based, treat it as "Hypothetical Theory" unless there is clearly zero credible supporting evidence — in that case, use "Fabricated / No Evidence".
4. When in doubt between two categories, choose the less certain one.
5. Only label as "Fact / Strong Evidence" if supported by robust, peer-reviewed, widely accepted evidence.

**Category Definitions:**
- Fact / Strong Evidence — Well-established, supported by robust empirical data, scientific consensus, and repeated verification.
- Debatable / Few Evidence — Some supporting evidence exists, but it is incomplete, contested, or controversial.
- Observation / Weak Evidence — Based mostly on anecdotal, circumstantial, or subjective impressions.
- Fabricated / No Evidence — No credible supporting evidence, or demonstrably false.
- Hypothetical Theory — A speculative explanation that is logically possible but unproven.

**Step 1: Determine claim status**
*ONLY inputs which STRICTLY falls under one of the below category is NOT a valid claim.*
- Greetings
- Casual chat 
- Neutral definitions
- Single words
- Questions 

*Inputs that ARE valid*
- A CLAIM asserts a factual proposition that can be evaluated as true or false 
- A THEORY is an explanatory framework supported by reasoning or evidence.
- A PERSONAL PREFERENCE or SUBJECTIVE OPINION can be evaluated by existing philosophical ideology and ranked as DEBATABLE or HYPOTHETICAL THEORY
- Any other VAGUE STATEMENT should also be ranked as DEBATABLE or HYPOTHETICAL THEORY

**Step 2: If NOT a claim/theory**
Return EXACTLY this JSON (no extra commentary, no extra fields):
{
  "verdict": "Not a Claim",
  "explanation": "This input is not a verifiable claim or theory.",
  "evidence": "A claim or theory must assert something that can be evaluated as true or false.",
  "source": "Please provide a statement that asserts or denies an idea."
}

**Step 3: If it IS a claim/theory**
Classify into EXACTLY ONE of these:
- "Fact / Strong Evidence"
- "Debatable / Few Evidence"
- "Observation / Weak Evidence"
- "Fabricated / No Evidence"
- "Hypothetical Theory"

**Step 4: Output**
Return ONLY JSON in this format (no other text before or after):
{
  "verdict": "ONE OF THE FIVE LABELS ABOVE OR 'Not a Claim'",
  "explanation": "2-3 sentences explaining reasoning",
  "evidence": "2-3 sentences of key supporting or counter evidence",
  "source": "Potential sources or references if applicable"
}
`.trim();

      const userMsg = `
Classify this claim (or state "Not a Claim" if it is not a verifiable claim/theory):

"${claim}"
`.trim();

      // Prepare request payload based on selected model
      let requestPayload = {
        model: optimalModel,
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: userMsg },
        ],
        max_tokens: 750,
        stream: false,
        private: false,
      };

      // Add temperature only for non-GPT-5-nano models
      if (optimalModel !== 'gpt-5-nano') {
        requestPayload.temperature = 0.7;
      }

      const resp = await axios.post(
        POLL_URL,
        requestPayload,
        {
          headers: {
            'Authorization': `Bearer ${POLL_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const generatedText =
        resp?.data?.choices?.[0]?.message?.content ??
        (typeof resp?.data === 'string' ? resp.data : '');

      handleAIResponse(generatedText);
    } catch (e) {
      console.error(e);
      setError('Could not analyze right now. Please try again in a few seconds.');
    } finally {
      setLoading(false);
      stopLoadingAnimation();
      
      // Restore title opacity
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      startCooldown();
    }
  };

  const handleAIResponse = (text) => {
    try {
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        const match = text?.match(/\{[\s\S]*\}/);
        if (match) json = JSON.parse(match[0]);
        else throw new Error('Invalid JSON from model');
      }

      const normalizedVerdict = normalizeVerdict(json?.verdict);
      if (normalizedVerdict === 'Not a Claim') {
        setIsQuestion(true);
      } else {
        setIsQuestion(false);
      }

      const cleaned = {
        verdict: normalizedVerdict,
        explanation: json?.explanation || '—',
        evidence: json?.evidence || '—',
        source: json?.source || '—',
      };

      setResult(cleaned);
      setExpanded(true);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      animateTriangleIn();
      animateResultIn();
    } catch (err) {
      setResult({
        verdict: 'Observation / Weak Evidence',
        explanation: 'AI response could not be parsed into JSON. Showing raw excerpt.',
        evidence: (text || '').slice(0, 200) + '...',
        source: 'Raw AI output',
      });
      setExpanded(true);
      animateTriangleIn();
      animateResultIn();
      setError('');
    }
  };

  const activeIndex = () => {
    if (!result || isQuestion) return -1;
    return verdictIndex(result.verdict);
  };

  const verdictColor = () => {
    const idx = activeIndex();
    return idx >= 0 ? COLORS[idx] : '#64B5F6';
  };

  // Professional Loading Component
  const renderLoadingAnimation = () => {
    const spin = loadingRotation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <View style={styles.loadingContainer}>
        <Animated.View style={[styles.loadingSpinner, { transform: [{ rotate: spin }] }]}>
          <Svg width={40} height={40}>
            <Circle
              cx="20"
              cy="20"
              r="18"
              stroke="#666"
              strokeWidth="2"
              strokeDasharray="8 4"
              fill="none"
            />
          </Svg>
        </Animated.View>
        
        <Text style={styles.loadingText}>
          Analyzing with {AI_MODELS[selectedModel]}
        </Text>
      </View>
    );
  };

  // Enhanced Triangle with clean animations
  const renderTriangle = () => {
    const triangleWidth = Math.min(windowWidth * 0.88, windowWidth - 40);
    const triangleHeight = triangleWidth * 0.8;
    const centerX = triangleWidth / 2;
    const divisions = 5;
    const sections = [];
    const idxActive = activeIndex();

    for (let i = 0; i < divisions; i++) {
      const ratio = i / divisions;
      const nextRatio = (i + 1) / divisions;
      const section = [
        { x: centerX - centerX * ratio, y: triangleHeight - triangleHeight * ratio },
        { x: centerX + centerX * ratio, y: triangleHeight - triangleHeight * ratio },
        { x: centerX + centerX * nextRatio, y: triangleHeight - triangleHeight * nextRatio },
        { x: centerX - centerX * nextRatio, y: triangleHeight - triangleHeight * nextRatio },
      ];
      const points = section.map(p => `${p.x},${p.y}`).join(' ');
      sections.push({
        points,
        index: divisions - i - 1,
        textPos: {
          x: centerX,
          y: triangleHeight - triangleHeight * (ratio + (nextRatio - ratio) / 2),
        },
      });
    }

    return (
      <View style={styles.triangleContainer}>
        <Animated.View style={{ 
          opacity: triangleOpacity, 
          transform: [{ scale: triangleScale }] 
        }}>
          <Svg height={triangleHeight} width={triangleWidth}>
            {sections.map((s, i) => (
              <React.Fragment key={i}>
                <Polygon
                  points={s.points}
                  fill={COLORS[s.index]}
                  opacity={idxActive === s.index ? 1 : 0.25}
                  stroke="#2a2a2a"
                  strokeWidth="1"
                />
                <SvgText
                  x={s.textPos.x}
                  y={s.textPos.y}
                  fontSize="12"
                  fill="#fff"
                  fontWeight="bold"
                  textAnchor="middle"
                  opacity={idxActive === s.index ? 1 : 0.6}
                >
                  {VERDICTS[s.index].split('/')[0].trim()}
                </SvgText>
              </React.Fragment>
            ))}
          </Svg>

          {isQuestion && (
            <View style={styles.notClaimOverlay}>
              <Text style={styles.notClaimText}>Not a Verifiable Claim</Text>
            </View>
          )}
        </Animated.View>
      </View>
    );
  };

  // -------- UI --------
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: titleOpacity }}>
          <Text style={styles.title}>Evilens</Text>
          <Text style={styles.subtitle}>Claim Verification</Text>
        </Animated.View>

        <View style={styles.card}>
          <Animated.View style={{ transform: [{ scale: inputScale }] }}>
            <TextInput
              style={styles.input}
              placeholder="Enter a claim to verify..."
              placeholderTextColor="#777"
              value={claim}
              onChangeText={setClaim}
              onFocus={animateInputFocus}
              onBlur={animateInputBlur}
              multiline
            />
          </Animated.View>

          <View style={styles.actionWrap}>
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={[
                  styles.button,
                  (!claim.trim() || loading || cooldownRemaining > 0) && styles.buttonDisabled,
                ]}
                onPress={analyzeClaim}
                disabled={!claim.trim() || loading || cooldownRemaining > 0}
                activeOpacity={0.9}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : cooldownRemaining > 0 ? (
                  <Text style={styles.buttonText}>Cooldown: {cooldownRemaining}s</Text>
                ) : (
                  <Text style={styles.buttonText}>Analyze Claim</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>

        {loading && renderLoadingAnimation()}

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {result && !loading ? (
          <>
            {renderTriangle()}

            {expanded && (
              <Animated.View
                style={[
                  styles.resultCard,
                  { 
                    opacity: resultOpacity, 
                    transform: [{ translateY: resultTranslateY }] 
                  },
                ]}
              >
                <Text style={[styles.verdictText, { color: verdictColor() }]}>
                  {result.verdict}
                </Text>

                <View style={styles.resultSection}>
                  <Text style={styles.resultLabel}>Explanation</Text>
                  <Text style={styles.resultText}>{result.explanation}</Text>
                </View>

                <View style={styles.resultSection}>
                  <Text style={styles.resultLabel}>Evidence</Text>
                  <Text style={styles.resultText}>{result.evidence}</Text>
                </View>

                <View style={styles.resultSection}>
                  <Text style={styles.resultLabel}>Source</Text>
                  <Text style={styles.resultText}>{result.source}</Text>
                </View>
              </Animated.View>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#0a0a0a' 
  },
  
  container: { 
    flex: 1, 
    backgroundColor: '#0a0a0a' 
  },
  
  contentContainer: { 
    padding: 20, 
    paddingBottom: 40 
  },
  
  title: {
    fontSize: 34, 
    fontWeight: '700', 
    color: '#fff', 
    marginTop: 20,
    textAlign: 'center', 
    letterSpacing: 1,
  },
  
  subtitle: { 
    fontSize: 16, 
    color: '#888', 
    textAlign: 'center', 
    marginBottom: 32,
    fontWeight: '400'
  },

  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 18,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    ...Platform.select({ 
      ios: { 
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 4 } 
    }),
  },

  input: {
    backgroundColor: '#242424',
    color: '#fff',
    padding: 18,
    borderRadius: 14,
    marginBottom: 20,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#333',
    fontWeight: '400',
  },

  actionWrap: { 
    marginTop: 4 
  },

  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    ...Platform.select({ 
      ios: { 
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: { elevation: 2 } 
    }),
  },
  
  buttonDisabled: { 
    backgroundColor: '#2F2F2F',
    ...Platform.select({ 
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 } 
    }),
  },
  
  buttonText: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 16 
  },

  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    marginVertical: 16,
  },

  loadingSpinner: {
    marginBottom: 12,
  },

  loadingText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontWeight: '400',
  },

  errorContainer: {
    marginTop: 8,
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'rgba(244, 67, 54, 0.12)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.25)',
  },
  
  errorText: { 
    color: '#F44336', 
    textAlign: 'center',
    fontWeight: '500'
  },

  triangleContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },

  resultCard: {
    backgroundColor: '#1a1a1a',
    padding: 24,
    borderRadius: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    ...Platform.select({ 
      ios: { 
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: { elevation: 3 } 
    }),
  },

  verdictText: { 
    fontSize: 22, 
    fontWeight: '700', 
    marginBottom: 20, 
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  resultSection: {
    marginBottom: 16,
  },

  resultLabel: {
    color: '#BBB',
    fontWeight: '600',
    marginBottom: 8,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  resultText: { 
    color: '#E5E5E5', 
    fontSize: 15, 
    lineHeight: 24,
    fontWeight: '400'
  },

  notClaimOverlay: {
    position: 'absolute',
    left: 0, 
    right: 0, 
    top: 0, 
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  notClaimText: { 
    color: '#64B5F6', 
    fontSize: 18, 
    fontWeight: '600', 
    textAlign: 'center', 
    padding: 20 
  },
});