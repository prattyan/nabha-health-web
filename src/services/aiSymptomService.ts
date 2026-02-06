import { StorageService } from './storageService';

// Mock TFLite model type
type TFLiteModel = {
  predict: (input: number[]) => Promise<number[]>;
};

export interface PredictionResult {
  condition: string;
  probability: number;
  recommendation: string;
}

export class AISymptomService {
  private static instance: AISymptomService;
  private model: TFLiteModel | null = null;
  private isModelLoading: boolean = false;
  private cache: Map<string, PredictionResult[]> = new Map();
  private storage: StorageService;

  // Known symptoms dictionary for "tokenization"
  private symptomMap: Record<string, number> = {
    'fever': 1, 'headache': 2, 'cough': 3, 'fatigue': 4,
    'nausea': 5, 'dizziness': 6, 'pain': 7, 'cold': 8
  };

  private constructor() {
    this.storage = StorageService.getInstance();
    // Preload model on initialization
    this.loadModel();
  }

  public static getInstance(): AISymptomService {
    if (!AISymptomService.instance) {
      AISymptomService.instance = new AISymptomService();
    }
    return AISymptomService.instance;
  }

  private async loadModel(): Promise<void> {
    if (this.model || this.isModelLoading) return;
    
    this.isModelLoading = true;
    console.log("Preloading AI Model...");
    
    // Simulate TFLite model loading time
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      this.model = {
        predict: async (input: number[]) => {
          // Simulate inference latency
          await new Promise(resolve => setTimeout(resolve, 50));
          // Mock inference logic based on input sum
          const sum = input.reduce((a, b) => a + b, 0);
          return [Math.random(), sum % 2 === 0 ? 0.8 : 0.2];
        }
      };
      console.log("AI Model Loaded Successfully");
    } catch (error) {
      console.error("Failed to load model", error);
    } finally {
      this.isModelLoading = false;
    }
  }

  // Parallelized Preprocessing
  private async preprocess(symptoms: string[]): Promise<number[]> {
    // Breakdown tasks that can run in parallel
    const normalizationPromise = Promise.all(
      symptoms.map(s => this.normalizeText(s))
    );
    
    const contextAnalysisPromise = this.analyzeContext(symptoms);

    const [normalizedSymptoms] = await Promise.all([
      normalizationPromise,
      contextAnalysisPromise
    ]);

    // Tokenization
    return normalizedSymptoms.map(s => this.symptomMap[s] || 0);
  }

  // Simulate heavy text normalization
  private async normalizeText(text: string): Promise<string> {
    // Simulate minimal delay for regex/nlp operations
    return text.toLowerCase().trim();
  }

  // Simulate context analysis running in parallel
  private async analyzeContext(symptoms: string[]): Promise<{ count: number }> {
    return { count: symptoms.length };
  }

  public async getPrediction(symptoms: string[]): Promise<{ results: PredictionResult[], latency: number, source: 'cache' | 'model' }> {
    const startTime = performance.now();
    const cacheKey = JSON.stringify(symptoms.sort());

    // 1. Check Cache
    if (this.cache.has(cacheKey)) {
        return {
            results: this.cache.get(cacheKey)!,
            latency: performance.now() - startTime,
            source: 'cache'
        };
    }

    // Ensure model is loaded
    if (!this.model) {
        if (!this.isModelLoading) {
            await this.loadModel();
        } else {
            // Wait for model
            while (this.isModelLoading) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }

    // 2. Parallel Preprocessing
    const inputVector = await this.preprocess(symptoms);

    // 3. Inference
    await this.model!.predict(inputVector);

    // Mock meaningful results based on keywords (since model is mocked)
    const results = this.mockExpertSystem(symptoms);

    // 4. Update Cache
    this.cache.set(cacheKey, results);

    return {
        results,
        latency: performance.now() - startTime,
        source: 'model'
    };
  }

  private mockExpertSystem(symptoms: string[]): PredictionResult[] {
    const lcSymptoms = symptoms.map(s => s.toLowerCase());
    
    if (lcSymptoms.includes('fever') && lcSymptoms.includes('cough')) {
        return [
            { condition: 'Viral Influenza', probability: 0.85, recommendation: 'Rest, fluids, paracetamol. Visit if fever > 3 days.' },
            { condition: 'Common Cold', probability: 0.45, recommendation: 'Steam inhalation, Vitamin C.' }
        ];
    }
    if (lcSymptoms.includes('headache') && lcSymptoms.includes('nausea')) {
        return [
            { condition: 'Migraine', probability: 0.75, recommendation: 'Dark room rest, hydration, analgesics.' },
            { condition: 'Dehydration', probability: 0.60, recommendation: 'ORS, Water intake.' }
        ];
    }
    
    return [
        { condition: 'General Viral Infection', probability: 0.30, recommendation: 'Monitor symptoms. Consult doctor if persists.' }
    ];
  }
}
