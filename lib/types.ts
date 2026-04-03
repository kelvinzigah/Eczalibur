// ─── Zone System ────────────────────────────────────────────────────────────

export type Zone = 'green' | 'yellow' | 'red';

export interface ZoneContent {
  /** Plain-language instructions for the parent */
  parentInstructions: string[];
  /** Kid-friendly quest instructions shown in child UI */
  childInstructions: string[];
  /** Emoji or icon name representing this zone's quest theme */
  icon: string;
  /** Background color hex for child UI */
  color: string;
}

export interface ActionPlan {
  id: string;
  createdAt: string; // ISO 8601
  green: ZoneContent;
  yellow: ZoneContent;
  red: ZoneContent;
  /** Raw JSON returned by Claude — stored for debugging */
  raw: string;
}

// ─── Child Profile ───────────────────────────────────────────────────────────

export type BodyArea =
  | 'face'
  | 'neck'
  | 'chest'
  | 'back'
  | 'arms'
  | 'hands'
  | 'legs'
  | 'feet'
  | 'scalp'
  | 'other';

export interface Medication {
  name: string;
  frequency: string;
  instructions: string;
}

export interface ChildProfile {
  id: string;
  name: string;
  /** Age in years */
  age: number;
  /** Hero character gender for child UI */
  gender?: 'male' | 'female' | 'neutral';
  /** City or region for weather lookup */
  location: string;
  diagnosis: string;
  medications: Medication[];
  /** Known environmental or food triggers */
  triggers: string[];
  /** Body areas affected */
  affectedAreas: BodyArea[];
  /** Parent-confirmed current action plan */
  actionPlan: ActionPlan | null;
  /** Whether parent has completed the consent/onboarding flow */
  onboardingComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Flare Log ───────────────────────────────────────────────────────────────

export interface FlareLog {
  id: string;
  childId: string;
  timestamp: string; // ISO 8601
  zone: Zone;
  /** 1–5 mood/itch severity rating from child */
  moodScore: number;
  /** Body areas affected during this flare */
  affectedAreas: BodyArea[];
  /** Optional child notes */
  notes: string;
  /** Base64-encoded photo URI (optional) */
  photoUri: string | null;
  /** Points awarded for logging this flare */
  pointsAwarded: number;
}

// ─── Points & Prizes ─────────────────────────────────────────────────────────

export interface Prize {
  id: string;
  name: string;
  description: string;
  /** Points required to redeem */
  pointCost: number;
  /** Emoji icon */
  icon: string;
  isActive: boolean;
  createdAt: string;
}

export type RedemptionStatus = 'pending' | 'approved' | 'denied';

export interface RedemptionRequest {
  id: string;
  childId: string;
  prizeId: string;
  prizeName: string;
  pointCost: number;
  status: RedemptionStatus;
  requestedAt: string;
  resolvedAt: string | null;
}

// ─── App State ───────────────────────────────────────────────────────────────

export interface PointsLedger {
  total: number;
  /** Running tally of all earned points (never decreases) */
  earned: number;
  /** Total points spent on redemptions */
  spent: number;
}

export interface AppState {
  profile: ChildProfile | null;
  flareLogs: FlareLog[];
  prizes: Prize[];
  redemptions: RedemptionRequest[];
  points: PointsLedger;
}

// ─── API Payloads ────────────────────────────────────────────────────────────

export interface GeneratePlanRequest {
  profile: Omit<ChildProfile, 'actionPlan' | 'onboardingComplete' | 'id' | 'createdAt' | 'updatedAt'>;
  /** Current temperature in Celsius from Open-Meteo */
  temperature: number;
  /** Current relative humidity % from Open-Meteo */
  humidity: number;
}

export interface GeneratePlanResponse {
  plan: ActionPlan;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  /** Recent flare logs for context (last 10) */
  recentLogs: FlareLog[];
  profile: Pick<ChildProfile, 'name' | 'age' | 'diagnosis' | 'medications' | 'triggers'>;
}

export interface ChatResponse {
  message: string;
}

export interface AppointmentSummaryRequest {
  profile: ChildProfile;
  logs: FlareLog[];
  /** ISO date of the upcoming appointment */
  appointmentDate: string;
}

export interface AppointmentSummaryResponse {
  summary: string;
}

// ─── Weather ─────────────────────────────────────────────────────────────────

export interface WeatherData {
  temperature: number;
  humidity: number;
  location: string;
  fetchedAt: string;
}
