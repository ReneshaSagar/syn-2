import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { Schema } from '@google/generative-ai'; // Keeping this type import if other files use it

dotenv.config();

const apiKey = process.env.REQUEST_API_KEY;
let openai: OpenAI | null = null;

if (apiKey && apiKey !== 'your_api_key_here') {
  try {
    openai = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://router.requesty.ai/v1',
    });
    console.log('⚡ Requesty (OpenAI SDK) Client initialized successfully.');
  } catch (error) {
    console.error('⚠️ Failed to initialize Requesty client:', error);
  }
} else {
  console.log('ℹ️ REQUEST_API_KEY not configured. Running with high-fidelity Mock AI fallback.');
}

/**
 * Exponential backoff helper for transient network and API errors (503, 429, etc.)
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = 4,
  delay: number = 1500
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const status = error.status || 0;
    const errorMessage = (error.message || '').toLowerCase();
    
    const isTransient = 
      status === 503 || 
      status === 429 || 
      errorMessage.includes('503') || 
      errorMessage.includes('429') ||
      errorMessage.includes('service unavailable') ||
      errorMessage.includes('resource exhausted') ||
      errorMessage.includes('rate limit');

    if (retries > 0 && isTransient) {
      console.warn(`⚠️ API transient error (${status || 'unknown'}: ${error.message}). Retrying in ${delay}ms... (${retries} attempts remaining)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const llmService = {
  /**
   * Helper to make structured JSON calls to Requesty.
   * Model defaults to gpt-4o-mini to keep costs incredibly low for volume tasks.
   */
  async callLlmJSON<T>(
    systemInstruction: string,
    userPrompt: string,
    modelId: string = 'openai/gpt-4o-mini',
    responseSchema?: any // We can ignore strict JSON schema for simple JSON mode, or use structured outputs if supported by Requesty
  ): Promise<T> {
    if (!openai) {
      return this.generateMockResponse<T>(userPrompt);
    }

    try {
      return await retryWithBackoff(async () => {
        // Force the system instruction to explicitly ask for JSON to satisfy OpenAI's json_object requirement
        let finalSystemInstruction = systemInstruction.includes('JSON') 
          ? systemInstruction 
          : systemInstruction + '\n\nIMPORTANT: You must output ONLY valid JSON.';

        if (responseSchema) {
          if (responseSchema.type === 'array') {
            finalSystemInstruction += '\n\nSince you must output a JSON Object, please wrap your array in an object with a single key "data" like { "data": [ ... ] }.\nFollow this JSON schema structure:\n' + JSON.stringify({ type: 'object', properties: { data: responseSchema } }, null, 2);
          } else {
            finalSystemInstruction += '\n\nYour JSON MUST strictly conform to the following JSON schema structure. Do not wrap the JSON in markdown code blocks, just return the raw JSON:\n' + JSON.stringify(responseSchema, null, 2);
          }
        }
        finalSystemInstruction += '\n\nMULTILINGUAL SUPPORT: You must detect the language of the user\'s input/idea. ALL your generated text, analysis, reports, and string values in the JSON MUST be written in the EXACT SAME LANGUAGE as the user\'s input.';

        const response = await openai!.chat.completions.create({
          model: modelId,
          messages: [
            { role: 'system', content: finalSystemInstruction },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 4000,
        });

        const text = response.choices[0]?.message?.content;
        console.log('--- LLM RAW RESPONSE [' + modelId + '] ---');
        console.log(text);
        console.log('-------------------------------------------');
        
        if (!text) {
          throw new Error('Received empty response from API.');
        }

        try {
          let parsed = JSON.parse(text);
          
          // OpenAI json_object mode forces the output to be an Object.
          // If we expect an array, the model will wrap it. Let's aggressively unwrap it,
          // BUT ONLY IF we actually expected an array in the schema!
          if (responseSchema && responseSchema.type === 'array') {
            if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
              const arrays = Object.values(parsed).filter(val => Array.isArray(val));
              if (arrays.length > 0) {
                parsed = arrays[0]; // grab the first array found
              }
            }
          }
          
          return parsed as T;
        } catch (parseErr: any) {
          console.error('--- JSON PARSE ERROR DETAILS ---');
          console.error('Error message:', parseErr.message);
          console.error('Response text end snippet:', text.substring(Math.max(0, text.length - 300)));
          throw parseErr;
        }
      });
    } catch (error: any) {
      console.warn(`⚠️ API error encountered after retries. Falling back to high-fidelity Mock AI response. Error: ${error.message || error}`);
      return this.generateMockResponse<T>(userPrompt);
    }
  },

  /**
   * Helper to call Requesty for standard markdown text outputs (e.g. final report markdown)
   */
  async callLlmText(
    systemInstruction: string,
    userPrompt: string,
    modelId: string = 'openai/gpt-4o'
  ): Promise<string> {
    if (!openai) {
      return this.generateMockTextReport(userPrompt);
    }

    try {
      return await retryWithBackoff(async () => {
        const finalSystemInstruction = systemInstruction + '\n\nMULTILINGUAL SUPPORT: You must detect the language of the user\'s input/idea. ALL your generated text and markdown MUST be written in the EXACT SAME LANGUAGE as the user\'s input.';
        const response = await openai!.chat.completions.create({
          model: modelId,
          messages: [
            { role: 'system', content: finalSystemInstruction },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
        });

        return response.choices[0]?.message?.content || '';
      });
    } catch (error: any) {
      console.warn(`⚠️ API error encountered after retries. Falling back to high-fidelity Mock AI report. Error: ${error.message || error}`);
      return this.generateMockTextReport(userPrompt);
    }
  },

  /**
   * Helper to call Requesty for a continuous chat session
   */
  async callLlmChat(
    systemInstruction: string,
    messages: { role: 'user' | 'assistant' | 'system', content: string }[],
    modelId: string = 'openai/gpt-4o'
  ): Promise<string> {
    if (!openai) {
      return "This is a mock response. In a real environment, I would answer your question based on the report context!";
    }

    try {
      return await retryWithBackoff(async () => {
        const finalSystemInstruction = systemInstruction + '\n\nMULTILINGUAL SUPPORT: You must detect the language of the user\'s input/messages. ALL your responses MUST be written in the EXACT SAME LANGUAGE as the user\'s input.';
        const fullMessages: any[] = [
          { role: 'system', content: finalSystemInstruction },
          ...messages
        ];

        const response = await openai!.chat.completions.create({
          model: modelId,
          messages: fullMessages,
          temperature: 0.7,
        });

        return response.choices[0]?.message?.content || '';
      });
    } catch (error: any) {
      console.warn(`⚠️ API error encountered in chat. Error: ${error.message || error}`);
      return "Sorry, I encountered an error while trying to process your question.";
    }
  },

  /**
   * High-fidelity mockup generator for hackathon out-of-the-box convenience.
   */
  generateMockResponse<T>(userPrompt: string): T {
    const promptText = userPrompt.toLowerCase();

    // 1. Audience Generator Mock
    if (promptText.includes('persona') || promptText.includes('generate 15') || promptText.includes('focus group') || promptText.includes('demographic focus')) {
      const personas = [];
      const roles = [
        { role: 'Student', count: 4, names: ['Alex Chen', 'Emily Watson', 'Marcus Rodriguez', 'Zoe Patel'], baseAge: 20 },
        { role: 'Founder', count: 3, names: ['Sarah Jenkins', 'David Kim', 'Amara Okafor'], baseAge: 32 },
        { role: 'Investor', count: 3, names: ['Richard Vance', 'Chloe Dupont', 'Michael Chang'], baseAge: 45 },
        { role: 'Engineer', count: 4, names: ['Sanjay Gupta', 'Elena Rostova', 'Kenji Tanaka', 'Jessica Miller'], baseAge: 27 },
        { role: 'Product Manager', count: 4, names: ['Taylor Swift', 'Oliver Jones', 'Sophia Lee', 'Ryan Reynolds'], baseAge: 30 }
      ];

      let idCounter = 1;
      for (const r of roles) {
        for (let i = 0; i < r.count; i++) {
          const name = r.names[i % r.names.length];
          personas.push({
            id: `mock-persona-${idCounter++}`,
            name,
            age: r.baseAge + (i * 2) - 1,
            role: r.role,
            experience: `${3 + i} years in their domain, managing daily tasks under varying degrees of pressure.`,
            motivations: [`Increasing productivity`, `Reducing daily stress`, `Finding optimized tools`],
            frustrations: [`Clunky user interfaces`, `Too many notifications`, `Steep learning curves`],
            concerns: [`Data privacy`, `Subscription costs`, `Reliability`],
            goals: [`Save 2 hours every day`, `Keep track of deadlines effortlessly`],
            personalityTraits: [`Analytical`, `Goal-oriented`, i % 2 === 0 ? 'Skeptic' : 'Enthusiastic']
          });
        }
      }
      return personas as unknown as T;
    }

    // 2. Idea Analyzer Mock
    if (promptText.includes('analyze') || promptText.includes('industry')) {
      const isStudyPlanner = promptText.includes('study') || promptText.includes('student');
      return {
        industry: isStudyPlanner ? 'EdTech' : 'SaaS / AI Tools',
        targetAudience: isStudyPlanner ? 'College students and university students' : 'General Tech Users',
        stakeholders: isStudyPlanner 
          ? ['College Students', 'Professors', 'University Administrators', 'Parents'] 
          : ['Business Owners', 'Developers', 'Product Managers'],
        businessType: 'B2C / Freemium',
        competitors: isStudyPlanner 
          ? ['Notion', 'Google Calendar', 'Todoist', 'Quizlet'] 
          : ['Competitor A', 'Competitor B'],
        keyValueProposition: isStudyPlanner
          ? 'Automated task prioritization and customized exam prep tailored to college syllabus schedules using AI.'
          : 'AI-powered efficiency automation platform for digital tasks.'
      } as unknown as T;
    }

    // 3. Simulation Mock
    if (promptText.includes('simulation') || promptText.includes('react to the idea')) {
      const isSkeptic = promptText.includes('skeptic');
      const excitementScore = isSkeptic ? 3 : 8;
      const likelihoodToUse = isSkeptic ? 2 : 7;
      return {
        reaction: isSkeptic 
          ? "I am skeptical about another AI tool. Most study planners don't actually get students to study; they just create visual clutter. If it integrates perfectly with Google Calendar and Blackboard, maybe I would check it out, but price and complexity are barriers."
          : "This looks super interesting! An AI study planner that schedules tasks automatically would save me hours of manual scheduling. I hate setting calendars manually. I would definitely try it.",
        excitementScore,
        concerns: isSkeptic 
          ? ["Steep learning curve", "Integration with school systems", "Monthly subscription costs"]
          : ["Will it support push notifications?", "Offline capability"],
        objections: isSkeptic 
          ? ["I already use Google Calendar and it works fine", "Too expensive for college students"]
          : ["I might forget to update my syllabus in the app"],
        likelihoodToUse,
        suggestions: [
          "Include WhatsApp integration for reminders",
          "Offer a free tier for basic syllabus parsing",
          "Ensure offline access"
        ]
      } as unknown as T;
    }

    // 4. Insight Generator Mock
    if (promptText.includes('insights') || promptText.includes('aggregate')) {
      return {
        overallInterestScore: 78,
        adoptionProbability: 65,
        topConcerns: [
          "Syllabus parsing accuracy",
          "Pricing sensitivity (high demand for free tier)",
          "Integration with existing calendars (Google, Outlook)"
        ],
        topSuggestions: [
          "Direct integration with university LMS (Canvas/Blackboard)",
          "WhatsApp/SMS daily digest of tasks",
          "Group study planning feature"
        ],
        mostInterestedSegment: "Undergraduate Students (Ages 18-22)",
        leastInterestedSegment: "Corporate Professionals / Investors",
        frequentlyAskedQuestions: [
          {
            question: "How does the AI parse my syllabus?",
            answer: "You upload a PDF of the syllabus, and the AI extracts assignment dates, exam schedules, and grade weights."
          },
          {
            question: "Does it sync with my Google Calendar?",
            answer: "Yes, it provides a 2-way sync with Google Calendar, Outlook, and Apple Calendar."
          }
        ],
        improvementRecommendations: [
          "Launch with a Freemium tier to drive early student adoption.",
          "Partner with student organizations for viral growth.",
          "Focus on robust calendar integrations as the primary core feature."
        ]
      } as unknown as T;
    }

    return {} as unknown as T;
  },

  /**
   * Mock final report markdown helper.
   */
  generateMockTextReport(userPrompt: string): string {
    return `# Synthetic Audience Validation Report: AI-powered Study Planner

## 1. Executive Summary
The target concept is an AI-powered study planner for college students designed to automate schedule planning and examination preparation. The concept received an overall interest score of **78/100** and a projected adoption probability of **65%**. The primary target demographic (undergraduates) shows high excitement about automated scheduling, while older students and educational administrators raise data privacy and cost-sensitivity concerns.

## 2. Audience Breakdown
The synthetic audience consisted of 15 diverse personas including:
* **Students (4)**: High interest, extremely cost-sensitive, values automation.
* **Engineers (4)**: Focused on calendar syncing, offline access, and reliability.
* **Product Managers (4)**: Analyzed usability and LMS (Learning Management System) integrations.
* **Founders & Investors (3)**: Skeptical of monetization strategy, suggested B2B partnerships.

## 3. Interest Score
* **Average Score**: 7.8 / 10
* **Highest Segment**: Students (8.5 / 10)
* **Lowest Segment**: Investors (5.0 / 10)

## 4. Adoption Probability
Based on the synthetic simulation, **65%** of student personas indicated a high likelihood to use the product within 1 month of release, provided a freemium model exists.

## 5. Common Objections
1. *"I already use Notion and Google Calendar for free; why pay?"*
2. *"Will it accurately parse complex, unstructured PDF syllabi?"*
3. *"Does it share my academic data with third parties?"*

## 6. Suggestions
* **Canvas/Blackboard Integrations**: Auto-fetch course deadlines.
* **SMS/WhatsApp Notifications**: To keep students updated without app fatigue.
* **Study Group Collaboration**: Sharing study schedules.

## 7. FAQs
* **Q: Can it read course changes mid-semester?** Yes, by re-uploading the updated syllabus or syncing directly.
* **Q: Is there a mobile app?** A responsive web app is preferred initially, followed by dedicated mobile wrappers.

## 8. Risk Analysis
* **High Risk**: PDF syllabus format changes breaking parsing engine.
* **Medium Risk**: High user acquisition cost offset by low customer lifetime value.

## 9. Improvement Opportunities
* **Freemium Strategy**: Monetize through premium study materials or group coordination features instead of charging for basic planning.
* **AI Syllabus OCR**: Invest heavily in the accuracy of syllabus parsing to ensure perfect setup on day one.
`;
  }
};
