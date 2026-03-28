// ============================================================
// Domain Types — 家族旅行プランナー
// ============================================================

/** 家族プロフィール */
export interface FamilyProfile {
  adultCount: number;        // 大人人数 1〜10
  childrenAges: number[];    // 子供の年齢リスト（空配列 = 子供なし）
}

/** 旅行条件 */
export interface TripCondition {
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  budget: number;            // 総予算（円）
  style: 'nature' | 'culture' | 'resort' | 'onsen' | 'city';
  area: 'domestic' | 'overseas';
}

/** 旅行先候補（Claude が生成する 1 件分） */
export interface Destination {
  name: string;
  overview: string;
  highlights: string[];
  estimatedBudget: string;   // 例: "8〜12万円（4人）"
  tips: string;
}

/** 旅行提案セット（DB: trip_proposals） */
export interface TripProposal {
  id: string;                // UUID
  userId: string;
  condition: TripCondition;
  destinations: Destination[];
  createdAt: string;         // ISO 8601
}

/** 保存済み提案（DB: saved_proposals） */
export interface SavedProposal {
  id: string;
  userId: string;
  proposalId: string | null;
  destination: Destination;  // 保存時点のスナップショット
  memo: string;
  isDecided: boolean;
  createdAt: string;
  updatedAt: string;
}

/** しおりの日程 1 日分 */
export interface ScheduleDay {
  date: string;              // YYYY-MM-DD
  spots: ScheduleSpot[];
}

export interface ScheduleSpot {
  name: string;
  memo: string;
}

/** 宿泊先情報 */
export interface Accommodation {
  name?: string;
  address?: string;
  checkIn?: string;          // YYYY-MM-DD
  checkOut?: string;
}

/** 持ち物リストアイテム */
export interface PackingItem {
  item: string;
  checked: boolean;
}

/** 旅のしおり（DB: itineraries） */
export interface TripItinerary {
  id: string;
  userId: string;
  savedProposalId: string | null;
  title: string;
  travelDates: { start: string | null; end: string | null };
  schedule: ScheduleDay[];
  accommodation: Accommodation;
  packingList: PackingItem[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// API Request / Response Types
// ============================================================

export interface ProposeRequest {
  familyProfile: FamilyProfile;
  condition: TripCondition;
}

export interface ProposeResponse {
  proposalId: string;
  destinations: Destination[];
}

export interface SaveRequest {
  proposalId: string;
  destination: Destination;
}

export interface SaveResponse {
  id: string;
}

export interface PatchSavedRequest {
  memo?: string;
  isDecided?: boolean;
}

export interface CreateItineraryRequest {
  savedProposalId: string;
}

export interface PatchItineraryRequest {
  title?: string;
  travelDates?: { start: string | null; end: string | null };
  schedule?: ScheduleDay[];
  accommodation?: Accommodation;
  packingList?: PackingItem[];
}

export interface ApiError {
  error: string;
  fields?: string[];
}

// ============================================================
// Budget Estimate Types — 旅行予算見積もり
// ============================================================

/** 予算カテゴリ別の見積もり */
export interface BudgetCategory {
  category: string;            // カテゴリ名（例: 交通費、宿泊費）
  estimatedMin: number;        // 最小見積もり（円）
  estimatedMax: number;        // 最大見積もり（円）
  note: string;                // 補足説明
}

/** 予算見積もりレスポンス */
export interface BudgetEstimateResponse {
  totalMin: number;            // 合計最小（円）
  totalMax: number;            // 合計最大（円）
  categories: BudgetCategory[];
  advice: string;              // 節約のコツ等
}

/** 予算見積もりリクエスト */
export interface BudgetEstimateRequest {
  destination: string;         // 旅行先名
  familyProfile: FamilyProfile;
  season: TripCondition['season'];
  style: TripCondition['style'];
  area: TripCondition['area'];
  nights: number;              // 宿泊数
}

// ============================================================
// Hearing Types — インタラクティブ・ヒアリング
// ============================================================

/** ヒアリング質問の表示条件 */
export interface QuestionCondition {
  hasChildren?: boolean;       // 子供がいる場合のみ表示
  hasInfant?: boolean;         // 幼児(0-2歳)がいる場合のみ表示
  area?: 'domestic' | 'overseas'; // 特定エリア選択時のみ表示
}

/** ヒアリング質問の選択肢 */
export interface HearingOption {
  id: string;
  label: string;
}

/** ヒアリング質問の回答形式 */
export type HearingAnswerType = 'multi-select' | 'single-select' | 'free-text';

/** ヒアリング質問カテゴリ */
export type HearingCategory =
  | 'hobbies'
  | 'priorities'
  | 'child-interests'
  | 'transport'
  | 'food';

/** ヒアリング質問 */
export interface HearingQuestion {
  id: string;
  category: HearingCategory;
  questionText: string;
  answerType: HearingAnswerType;
  options: HearingOption[] | null;
  condition: QuestionCondition | null;
  icon?: string;
}

/** ヒアリング回答（1問分） */
export interface HearingAnswer {
  questionId: string;
  selectedOptions: string[];
  freeText: string | null;
  skipped: boolean;
}

/** 好みプロフィール（JSONB構造） */
export interface HearingPreferences {
  hobbies: string[];
  travelPriorities: string[];
  childInterests: string[];
  transportPreference: string | null;
  foodPreferences: string[];
  customNotes: string | null;
}

/** 好みプロフィール（DBレコード） */
export interface HearingProfile {
  id: string;
  userId: string;
  preferences: HearingPreferences;
  createdAt: string;
  updatedAt: string;
}
