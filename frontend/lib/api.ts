const API_BASE = "http://localhost:3001"

// Asset IDs
export const BTC_ASSET_ID = "9191415d-caf6-41db-a556-b660c2b8d398"
export const USDT_ASSET_ID = "00000000-0000-0000-0000-000000000002"

// Auth response type
export interface AuthResponse {
  success: boolean
  user_id?: string
  token?: string
  message: string
}

export interface SignupRequest {
  email: string
  password: string
}

export interface SigninRequest {
  email: string
  password: string
}

export interface OpenOrderRequest {
  asset_id: string
  quantity: string
  price: string
  direction: "long" | "short"
  stop_loss?: string
  take_profit?: string
  quote_asset_id: string
  idempotency_key?: string
}

export interface ClosePositionRequest {
  position_id: string
  close_price: string
  close_reason: string
  quote_asset_id: string
}

export interface Order {
  id: string
  user_id: string
  asset_id: string
  side: string
  quantity: string
  price: string
  order_status: string
  created_at: string
  idempotency_key?: string
}

export interface Balance {
  id: string
  user_id: string
  asset_id: string
  quantity: string
  updated_at: string
}

export interface Position {
  position_id: string
  user_id: string
  asset_id: string
  direction: string
  position_size: string
  entry_price: string
  stop_loss_price?: string
  profit_price?: string
  open_time: string
  close_time?: string
  close_price?: string
  profit_realized?: string
  position_status: string
  quote_asset_id?: string
  leverage?: string
  liquidation_price?: string
}

export interface PositionPnL {
  position_id: string
  direction: string
  entry_price: string
  position_size: string
  unrealized_pnl: string
  pnl_percentage: string
}

export interface PnLResponse {
  positions: PositionPnL[]
  total_unrealized_pnl: string
  total_margin_used: string
  equity: string
}

export interface Candle {
  candles_id: string
  asset_id: string
  open_price: string
  close_price: string
  high_price: string
  low_price: string
  volume: string
  trade_time: string
  trade_duration: string
  asset_name: string
}

export function saveToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("auth_token", token)
  }
}

export function getToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("auth_token")
  }
  return null
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_token")
  }
}

export function saveUser(userId: string, email: string, token?: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("user_id", userId)
    localStorage.setItem("user_email", email)
    if (token) saveToken(token)
  }
}

export function getUser(): { userId: string | null; email: string | null } {
  if (typeof window !== "undefined") {
    return {
      userId: localStorage.getItem("user_id"),
      email: localStorage.getItem("user_email"),
    }
  }
  return { userId: null, email: null }
}

export function clearUser() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("user_id")
    localStorage.removeItem("user_email")
    clearToken()
  }
}

export function isLoggedIn(): boolean {
  if (typeof window !== "undefined") {
    return !!getToken()
  }
  return false
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  if (token) {
    return { Authorization: `Bearer ${token}` }
  }
  return {}
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = { ...authHeaders(), ...(options.headers as Record<string, string> || {}) }
  const res = await fetch(url, { ...options, headers })

  if (res.status === 401) {
    clearUser()
    if (typeof window !== "undefined") {
      window.location.href = "/auth"
    }
  }

  return res
}

export async function signup(data: SignupRequest): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function signin(data: SigninRequest): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function getBalance(): Promise<Balance[]> {
  const res = await authFetch(`${API_BASE}/balance`)
  const data = await res.json()
  return data.balances
}

export async function getOrders(): Promise<Order[]> {
  const res = await authFetch(`${API_BASE}/orders`)
  const data = await res.json()
  return data.orders
}

export async function openOrder(data: OpenOrderRequest): Promise<{ success: boolean; order_id?: string; message: string }> {
  const res = await authFetch(`${API_BASE}/order/open`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function getPositions(status: "open" | "closed" = "open"): Promise<Position[]> {
  const res = await authFetch(`${API_BASE}/positions?position_status=${status}`)
  const data = await res.json()
  return data.positions
}

export async function closePosition(data: ClosePositionRequest): Promise<{ success: boolean; message: string }> {
  const res = await authFetch(`${API_BASE}/order/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function getPnL(currentPrice: string): Promise<PnLResponse> {
  const res = await authFetch(`${API_BASE}/pnl?current_price=${currentPrice}`)
  return res.json()
}

export async function getCandles(assetId: string, duration = "1m", limit = 100): Promise<Candle[]> {
  const res = await fetch(`${API_BASE}/candles?asset_id=${assetId}&duration=${duration}&limit=${limit}`)
  const data = await res.json()
  return data.candles
}
