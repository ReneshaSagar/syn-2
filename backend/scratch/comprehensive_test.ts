/**
 * COMPREHENSIVE TEST SUITE — Synthetic Audience Simulator
 * ========================================================
 * Tests all API endpoints end-to-end against the running backend server.
 * 
 * Usage: npx tsx scratch/comprehensive_test.ts
 */

const API_URL = 'http://localhost:5000';
const SAMPLE_IDEA = 'A subscription box for indoor plant care that delivers customized soil, fertilizer, and plant health diagnostics based on photos users upload of their plants.';

// ── Helpers ──────────────────────────────────────────────────

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details: string;
  error?: string;
}

const results: TestResult[] = [];
let currentIdeaId: string | null = null;
let personas: any[] = [];
let simulations: any[] = [];

function color(text: string, code: number): string {
  return `\x1b[${code}m${text}\x1b[0m`;
}

const green = (t: string) => color(t, 32);
const red = (t: string) => color(t, 31);
const yellow = (t: string) => color(t, 33);
const cyan = (t: string) => color(t, 36);
const bold = (t: string) => color(t, 1);

async function makeRequest(method: string, path: string, body?: any): Promise<any> {
  const url = `${API_URL}${path}`;
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function runTest(name: string, fn: () => Promise<string>): Promise<void> {
  const start = Date.now();
  try {
    const details = await fn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, duration, details });
    console.log(`  ${green('✓')} ${name} ${cyan(`(${(duration / 1000).toFixed(1)}s)`)}`);
    if (details) console.log(`    ${details.split('\n').join('\n    ')}`);
  } catch (err: any) {
    const duration = Date.now() - start;
    results.push({ name, passed: false, duration, details: '', error: err.message });
    console.log(`  ${red('✗')} ${name} ${cyan(`(${(duration / 1000).toFixed(1)}s)`)}`);
    console.log(`    ${red('Error: ' + err.message)}`);
  }
}

// ── Test Cases ───────────────────────────────────────────────

async function testHealthCheck(): Promise<string> {
  const data = await makeRequest('GET', '/health');
  if (data.status !== 'ok') throw new Error(`Health status is "${data.status}", expected "ok"`);
  if (!data.service) throw new Error('Missing service name');
  return `Status: ${data.status} | DB: ${data.databaseConnection} | LLM: ${data.geminiStatus}`;
}

async function testAnalyzeIdea(): Promise<string> {
  const data = await makeRequest('POST', '/analyze-idea', {
    idea: SAMPLE_IDEA,
    config: { lens: ['market_fit'], depth: 'quick', region: 'global' }
  });

  if (!data.ideaId) throw new Error('No ideaId returned');
  if (!data.analysis) throw new Error('No analysis returned');
  if (!data.analysis.industry) throw new Error('No industry in analysis');
  if (!data.analysis.targetAudience) throw new Error('No targetAudience in analysis');

  currentIdeaId = data.ideaId;

  return `IdeaId: ${data.ideaId}\n` +
    `Industry: ${data.analysis.industry}\n` +
    `Business Type: ${data.analysis.businessType}\n` +
    `Value Prop: ${data.analysis.keyValueProposition?.substring(0, 80)}...\n` +
    `Audience Segments: ${data.analysis.audienceComposition?.length || 0}`;
}

async function testAnalyzeIdeaValidation(): Promise<string> {
  // Test empty string
  try {
    await makeRequest('POST', '/analyze-idea', { idea: '' });
    throw new Error('Should have rejected empty idea');
  } catch (e: any) {
    if (!e.message.includes('400')) throw new Error('Expected 400 for empty idea, got: ' + e.message);
  }

  // Test missing body
  try {
    await makeRequest('POST', '/analyze-idea', {});
    throw new Error('Should have rejected missing idea');
  } catch (e: any) {
    if (!e.message.includes('400')) throw new Error('Expected 400 for missing idea, got: ' + e.message);
  }

  return 'Empty idea → 400 ✓ | Missing idea → 400 ✓';
}

async function testGenerateAudience(): Promise<string> {
  if (!currentIdeaId) throw new Error('No ideaId from previous test');

  const data = await makeRequest('POST', '/generate-audience', {
    ideaId: currentIdeaId
  });

  if (!data.personas || !Array.isArray(data.personas)) throw new Error('No personas array');
  if (data.personas.length === 0) throw new Error('Empty personas array');

  personas = data.personas;

  // Validate persona structure
  const p = personas[0];
  const requiredFields = ['id', 'name', 'age', 'role', 'segment'];
  for (const field of requiredFields) {
    if (!p[field] && p[field] !== 0) throw new Error(`Persona missing field: ${field}`);
  }

  const segments = [...new Set(personas.map((p: any) => p.segment))];

  return `Generated ${personas.length} personas across ${segments.length} segments\n` +
    `Segments: ${segments.join(', ')}\n` +
    `Sample: ${p.name} (${p.role}, Age ${p.age})`;
}

async function testGenerateAudienceValidation(): Promise<string> {
  // Non-existent ideaId
  try {
    await makeRequest('POST', '/generate-audience', { ideaId: 'nonexistent-id-12345' });
    throw new Error('Should have rejected nonexistent ideaId');
  } catch (e: any) {
    if (!e.message.includes('404')) throw new Error('Expected 404 for nonexistent idea, got: ' + e.message);
  }

  return 'Nonexistent ideaId → 404 ✓';
}

async function testSimulate(): Promise<string> {
  if (!currentIdeaId) throw new Error('No ideaId from previous test');

  const data = await makeRequest('POST', '/simulate', {
    ideaId: currentIdeaId
  });

  if (!data.simulations || !Array.isArray(data.simulations)) throw new Error('No simulations array');
  if (data.simulations.length === 0) throw new Error('Empty simulations array');

  simulations = data.simulations;

  // Validate simulation structure
  const sim = simulations[0];
  if (!sim.result) throw new Error('Simulation missing result');
  if (typeof sim.result.excitementScore !== 'number') throw new Error('Missing excitementScore');
  if (typeof sim.result.reaction !== 'string') throw new Error('Missing reaction text');

  const avgExcitement = simulations.reduce((sum: number, s: any) => sum + (s.result?.excitementScore || 0), 0) / simulations.length;
  const wouldTryCount = simulations.filter((s: any) => s.result?.wouldTry).length;
  const wouldPayCount = simulations.filter((s: any) => s.result?.wouldPay).length;

  return `Simulated ${simulations.length} reactions\n` +
    `Avg Excitement: ${avgExcitement.toFixed(1)}/10\n` +
    `Would Try: ${wouldTryCount}/${simulations.length} (${((wouldTryCount / simulations.length) * 100).toFixed(0)}%)\n` +
    `Would Pay: ${wouldPayCount}/${simulations.length} (${((wouldPayCount / simulations.length) * 100).toFixed(0)}%)`;
}

async function testGenerateReport(): Promise<string> {
  if (!currentIdeaId) throw new Error('No ideaId from previous test');

  const data = await makeRequest('POST', '/generate-report', {
    ideaId: currentIdeaId
  });

  if (!data.insights) throw new Error('No insights returned');
  if (!data.report) throw new Error('No report returned');
  if (typeof data.insights.overallInterestScore !== 'number') throw new Error('Missing overallInterestScore');
  if (typeof data.insights.adoptionProbability !== 'number') throw new Error('Missing adoptionProbability');

  const has = (f: string) => data.insights[f] ? '✓' : '✗';

  return `Overall Interest: ${data.insights.overallInterestScore}/100\n` +
    `Adoption Probability: ${data.insights.adoptionProbability}%\n` +
    `Most Interested: ${data.insights.mostInterestedSegment}\n` +
    `Least Interested: ${data.insights.leastInterestedSegment}\n` +
    `Biggest Opportunity: ${data.insights.biggestOpportunity?.substring(0, 80)}...\n` +
    `Biggest Risk: ${data.insights.biggestRisk?.substring(0, 80)}...\n` +
    `Fields: topConcerns ${has('topConcerns')} | roadmap ${has('actionableRoadmap')} | FAQ ${has('frequentlyAskedQuestions')} | confidence ${has('confidence')}\n` +
    `Competitors: ${data.competitors?.length || 0} found\n` +
    `Communities: ${data.communityRecommendations?.length || 0} found\n` +
    `Report markdown: ${data.report.fullReportMarkdown?.length || 0} chars`;
}

async function testRedTeamAnalysis(): Promise<string> {
  if (!currentIdeaId) throw new Error('No ideaId from previous test');

  const data = await makeRequest('POST', '/generate-red-team', {
    ideaId: currentIdeaId
  });

  if (!data.redTeamReport) throw new Error('No redTeamReport returned');
  const rt = data.redTeamReport;

  if (!rt.overallRiskLevel) throw new Error('Missing overallRiskLevel');
  if (!rt.summary) throw new Error('Missing summary');

  return `Risk Level: ${rt.overallRiskLevel}\n` +
    `Hidden Assumptions: ${rt.hiddenAssumptions?.length || 0}\n` +
    `Adoption Barriers: ${rt.adoptionBarriers?.length || 0}\n` +
    `Competitive Threats: ${rt.competitiveThreats?.length || 0}\n` +
    `Pricing Problems: ${rt.pricingProblems?.length || 0}\n` +
    `Trust Concerns: ${rt.trustAndPrivacyConcerns?.length || 0}\n` +
    `Persona Contradictions: ${rt.contradictionsBetweenPersonas?.length || 0}\n` +
    `Summary: ${rt.summary.substring(0, 100)}...`;
}

async function testChatWithPersona(): Promise<string> {
  if (!currentIdeaId || personas.length === 0) throw new Error('No ideaId or personas');

  const targetPersona = personas[0];
  const data = await makeRequest('POST', '/chat', {
    ideaId: currentIdeaId,
    messages: [
      { role: 'user', content: `Hi ${targetPersona.name}, what specifically concerns you about this product?` }
    ],
    context: {
      type: 'persona',
      targetId: targetPersona.id
    }
  });

  if (!data.response) throw new Error('No response returned');
  if (typeof data.response !== 'string') throw new Error('Response is not a string');
  if (data.response.length < 10) throw new Error('Response too short, likely empty');

  return `Persona: ${targetPersona.name} (${targetPersona.role})\n` +
    `Response length: ${data.response.length} chars\n` +
    `Score update: ${data.newScore !== undefined ? data.newScore + '/10' : 'none'}\n` +
    `Preview: "${data.response.substring(0, 120)}..."`;
}

async function testChatWithGeneral(): Promise<string> {
  if (!currentIdeaId) throw new Error('No ideaId');

  const data = await makeRequest('POST', '/chat', {
    ideaId: currentIdeaId,
    messages: [
      { role: 'user', content: 'What is the biggest risk to this business model based on the simulation data?' }
    ],
    context: {
      type: 'general'
    }
  });

  if (!data.response) throw new Error('No response returned');
  if (data.response.length < 10) throw new Error('Response too short');

  return `Response length: ${data.response.length} chars\n` +
    `Preview: "${data.response.substring(0, 120)}..."`;
}

async function testGenerateAsset(): Promise<string> {
  if (!currentIdeaId) throw new Error('No ideaId');

  const data = await makeRequest('POST', '/generate-asset', {
    ideaId: currentIdeaId,
    targetText: 'Users are worried about plant health misdiagnosis from photo uploads. Design a trust-building strategy.'
  });

  if (!data.assetMarkdown) throw new Error('No assetMarkdown returned');
  if (data.assetMarkdown.length < 50) throw new Error('Asset content too short');

  return `Asset length: ${data.assetMarkdown.length} chars\n` +
    `Preview: "${data.assetMarkdown.substring(0, 120)}..."`;
}

async function testGenerateDraft(): Promise<string> {
  if (!currentIdeaId) throw new Error('No ideaId');

  const data = await makeRequest('POST', '/generate-draft', {
    ideaId: currentIdeaId,
    platform: 'reddit',
    community: 'r/IndoorGarden'
  });

  if (!data.draftMarkdown) throw new Error('No draftMarkdown returned');
  if (data.draftMarkdown.length < 50) throw new Error('Draft content too short');

  return `Draft for: Reddit r/IndoorGarden\n` +
    `Length: ${data.draftMarkdown.length} chars\n` +
    `Preview: "${data.draftMarkdown.substring(0, 120)}..."`;
}

async function testHistory(): Promise<string> {
  const data = await makeRequest('GET', '/history');

  if (!data.history || !Array.isArray(data.history)) throw new Error('No history array');
  if (data.history.length === 0) throw new Error('History is empty (expected at least 1 idea)');

  const ourIdea = data.history.find((h: any) => h.id === currentIdeaId);
  if (!ourIdea) throw new Error('Our test idea not found in history');

  return `Total ideas in history: ${data.history.length}\n` +
    `Our idea found: ✓ (${ourIdea.rawText?.substring(0, 60)}...)`;
}

async function testHistoryLoadState(): Promise<string> {
  if (!currentIdeaId) throw new Error('No ideaId');

  const data = await makeRequest('GET', `/history/${currentIdeaId}`);

  if (!data.ideaId) throw new Error('No ideaId in loaded state');
  if (!data.analyzedIdea) throw new Error('No analyzedIdea in loaded state');
  if (!data.personas || data.personas.length === 0) throw new Error('No personas in loaded state');
  if (!data.simulations || data.simulations.length === 0) throw new Error('No simulations in loaded state');
  if (!data.report) throw new Error('No report in loaded state');
  if (!data.report.insights) throw new Error('No insights in loaded report');

  return `Full state loaded successfully\n` +
    `Personas: ${data.personas.length} | Simulations: ${data.simulations.length}\n` +
    `Report present: ✓ | Insights present: ✓\n` +
    `Chat memory keys: ${Object.keys(data.report.chatMemory || {}).length}\n` +
    `Red Team: ${data.report.redTeamReport ? '✓' : '✗'}\n` +
    `Version History: ${data.versionHistory?.length || 0} entries`;
}

async function testSummarizeChat(): Promise<string> {
  const data = await makeRequest('POST', '/summarize-chat', {
    messages: [
      { role: 'user', content: 'I think we should focus more on enterprise clients who manage office plant decorations.' },
      { role: 'assistant', content: 'That is an interesting pivot! Enterprise clients with office plant management could have bigger budgets and recurring contracts.' },
      { role: 'user', content: 'Yes, and we could add a fleet management dashboard for tracking plant health across multiple offices.' }
    ]
  });

  if (!data.pivotInstruction) throw new Error('No pivotInstruction returned');
  if (data.pivotInstruction.length < 10) throw new Error('Pivot instruction too short');

  return `Pivot instruction: "${data.pivotInstruction.substring(0, 120)}..."`;
}

async function testSaveDebate(): Promise<string> {
  if (!currentIdeaId || personas.length < 2) throw new Error('Need ideaId and at least 2 personas');

  const data = await makeRequest('POST', '/save-debate', {
    ideaId: currentIdeaId,
    debateMemory: {
      persona1Id: personas[0].id,
      persona2Id: personas[1].id,
      topic: 'Is the subscription model the right pricing strategy?',
      messages: [
        { senderId: personas[0].id, content: 'I love the subscription idea — it ensures ongoing engagement.' },
        { senderId: personas[1].id, content: 'But subscription fatigue is real. Many users cancel after 3 months.' }
      ],
      conclusion: null
    }
  });

  if (!data.success) throw new Error('Debate save did not return success');

  return 'Debate memory saved successfully ✓';
}

async function testChatValidation(): Promise<string> {
  // Missing ideaId
  try {
    await makeRequest('POST', '/chat', { messages: [{ role: 'user', content: 'hi' }] });
    throw new Error('Should have rejected missing ideaId');
  } catch (e: any) {
    if (!e.message.includes('400')) throw new Error('Expected 400 for missing ideaId, got: ' + e.message);
  }

  // Missing messages
  try {
    await makeRequest('POST', '/chat', { ideaId: currentIdeaId });
    throw new Error('Should have rejected missing messages');
  } catch (e: any) {
    if (!e.message.includes('400')) throw new Error('Expected 400 for missing messages, got: ' + e.message);
  }

  return 'Missing ideaId → 400 ✓ | Missing messages → 400 ✓';
}

async function testAssetValidation(): Promise<string> {
  // Missing targetText
  try {
    await makeRequest('POST', '/generate-asset', { ideaId: currentIdeaId });
    throw new Error('Should have rejected missing targetText');
  } catch (e: any) {
    if (!e.message.includes('400')) throw new Error('Expected 400 for missing targetText, got: ' + e.message);
  }

  return 'Missing targetText → 400 ✓';
}

// ── Main Runner ──────────────────────────────────────────────

async function main() {
  console.log('\n' + bold('═══════════════════════════════════════════════════════════'));
  console.log(bold('  🧪 SYNTHETIC AUDIENCE SIMULATOR — COMPREHENSIVE TEST SUITE'));
  console.log(bold('═══════════════════════════════════════════════════════════'));
  console.log(`  ${cyan('Server:')} ${API_URL}`);
  console.log(`  ${cyan('Idea:')} "${SAMPLE_IDEA.substring(0, 70)}..."`);
  console.log(`  ${cyan('Time:')} ${new Date().toISOString()}\n`);

  // ── Phase 1: Server Health ───────────────────────────────
  console.log(bold('\n📡 PHASE 1: SERVER HEALTH'));
  console.log('─────────────────────────────────────');
  await runTest('Health Check', testHealthCheck);

  // ── Phase 2: Core Pipeline (Sequential) ──────────────────
  console.log(bold('\n🔬 PHASE 2: CORE SIMULATION PIPELINE'));
  console.log('─────────────────────────────────────');
  await runTest('Step 1 — Analyze Idea', testAnalyzeIdea);
  await runTest('Step 1b — Input Validation (Analyze)', testAnalyzeIdeaValidation);
  await runTest('Step 2 — Generate Audience', testGenerateAudience);
  await runTest('Step 2b — Input Validation (Audience)', testGenerateAudienceValidation);
  await runTest('Step 3 — Simulate Reactions', testSimulate);
  await runTest('Step 4 — Generate Report & Insights', testGenerateReport);
  await runTest('Step 5 — Red Team Analysis', testRedTeamAnalysis);

  // ── Phase 3: Interactive Features ────────────────────────
  console.log(bold('\n💬 PHASE 3: INTERACTIVE FEATURES'));
  console.log('─────────────────────────────────────');
  await runTest('Chat with Persona', testChatWithPersona);
  await runTest('Chat with General Analyst', testChatWithGeneral);
  await runTest('Chat Input Validation', testChatValidation);
  await runTest('Summarize Chat → Pivot Instruction', testSummarizeChat);
  await runTest('Save Debate Memory', testSaveDebate);

  // ── Phase 4: Asset Generation ────────────────────────────
  console.log(bold('\n📄 PHASE 4: ASSET GENERATION'));
  console.log('─────────────────────────────────────');
  await runTest('Generate Trust Strategy Asset', testGenerateAsset);
  await runTest('Generate Reddit Launch Draft', testGenerateDraft);
  await runTest('Asset Input Validation', testAssetValidation);

  // ── Phase 5: History & State Management ──────────────────
  console.log(bold('\n📚 PHASE 5: HISTORY & STATE MANAGEMENT'));
  console.log('─────────────────────────────────────');
  await runTest('List History', testHistory);
  await runTest('Load Full Idea State', testHistoryLoadState);

  // ── Summary ──────────────────────────────────────────────
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log('\n' + bold('═══════════════════════════════════════════════════════════'));
  console.log(bold('  📊 TEST RESULTS SUMMARY'));
  console.log(bold('═══════════════════════════════════════════════════════════'));
  console.log(`  ${green('Passed:')} ${passed}/${results.length}`);
  if (failed > 0) console.log(`  ${red('Failed:')} ${failed}/${results.length}`);
  console.log(`  ${cyan('Total Duration:')} ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`  ${cyan('Avg Per Test:')} ${(totalDuration / results.length / 1000).toFixed(1)}s`);

  if (failed > 0) {
    console.log(`\n  ${red(bold('FAILED TESTS:'))}`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`    ${red('✗')} ${r.name}: ${r.error}`);
    });
  }

  console.log('\n' + (failed === 0
    ? green(bold('  ✅ ALL TESTS PASSED!'))
    : red(bold(`  ❌ ${failed} TEST(S) FAILED`)))
  );
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(red(`\n❌ Fatal error: ${err.message}`));
  process.exit(1);
});
