"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const workflow_1 = require("../src/langgraph/workflow");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Sample Startup Idea
const SAMPLE_IDEA = "AI-powered study planner for college students that parses syllabus PDFs, generates daily calendar events, and automates exam prep schedules based on course difficulty.";
async function runVerification() {
    console.log('==================================================');
    console.log('🤖 STARTING END-TO-END WORKFLOW VERIFICATION 🤖');
    console.log('==================================================');
    console.log(`Sample Idea: "${SAMPLE_IDEA}"\n`);
    try {
        const startTime = Date.now();
        // Execute the compiled workflow
        const result = await workflow_1.compiledWorkflow.invoke({
            rawInput: SAMPLE_IDEA
        });
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Workflow completed successfully in ${duration} seconds!\n`);
        console.log('==================================================');
        console.log('RESULTS OVERVIEW');
        console.log('==================================================');
        console.log(`- Idea ID: ${result.ideaId}`);
        console.log(`- Industry: ${result.analyzedIdea?.industry}`);
        console.log(`- Business Type: ${result.analyzedIdea?.businessType}`);
        console.log(`- Generated Personas Count: ${result.personas?.length}`);
        console.log(`- Simulated Reactions Count: ${result.simulations?.length}`);
        console.log(`- Overall Interest Score: ${result.insights?.overallInterestScore}/100`);
        console.log(`- Projected Adoption Probability: ${result.insights?.adoptionProbability}%`);
        console.log(`- Most Interested Segment: ${result.insights?.mostInterestedSegment}`);
        console.log(`- Least Interested Segment: ${result.insights?.leastInterestedSegment}`);
        console.log(`- Top Concerns: ${result.insights?.topConcerns?.join(', ')}\n`);
        console.log('==================================================');
        console.log('PERSONA SAMPLES (First 3)');
        console.log('==================================================');
        if (result.personas && result.personas.length > 0) {
            result.personas.slice(0, 3).forEach((p, idx) => {
                const sim = result.simulations?.find((s) => s.personaId === p.id);
                console.log(`Persona #${idx + 1}: ${p.name} (${p.role}, Age ${p.age})`);
                console.log(`  - Traits: ${p.personalityTraits?.join(', ')}`);
                console.log(`  - Excitement Score: ${sim?.result?.excitementScore}/10`);
                console.log(`  - Reaction snippet: "${sim?.result?.reaction?.substring(0, 100)}..."`);
                console.log('--------------------------------------------------');
            });
        }
        // Write the full markdown report to disk for reference
        if (result.report?.fullReportMarkdown) {
            const outputDir = path.join(__dirname, '../scratch');
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            const outputPath = path.join(outputDir, 'sample_output_report.md');
            fs.writeFileSync(outputPath, result.report.fullReportMarkdown, 'utf-8');
            console.log(`\n💾 Saved full validation report to:`);
            console.log(`   ${outputPath}`);
        }
    }
    catch (error) {
        console.error('❌ Error during E2E verification:', error);
        process.exit(1);
    }
}
// Execute
runVerification();
//# sourceMappingURL=test_endpoints.js.map