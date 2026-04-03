import { http, HttpResponse } from 'msw'
import type { UserResponse, TokenPair } from '../types'

// Use the same base URL as the API client
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 
  (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : null) ?? 
  'http://localhost:8000/api/v1'

// Define your mock API handlers here
export const handlers = [
  // Login endpoint - returns TokenPair
  http.post(`${API_BASE}/auth/login`, () => {
    return HttpResponse.json<TokenPair>({
      access_token: 'mock-access-token-jwt',
      refresh_token: 'mock-refresh-token',
      token_type: 'bearer',
      expires_in: 900,
    })
  }),

  // Register endpoint - returns UserResponse  
  http.post(`${API_BASE}/auth/register`, () => {
    return HttpResponse.json<UserResponse>({
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      username: 'testuser',
      role: 'USER',
      tier: 'free',
      is_active: true,
      email_verified: false,
    }, { status: 201 })
  }),

  // Get current user
  http.get(`${API_BASE}/auth/me`, () => {
    return HttpResponse.json<UserResponse>({
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      username: 'testuser',
      role: 'USER',
      tier: 'free',
      is_active: true,
      email_verified: false,
    })
  }),

  // Logout endpoint
  http.post(`${API_BASE}/auth/logout`, () => {
    return HttpResponse.json({ message: 'Logged out successfully' })
  }),

  // Update profile
  http.patch(`${API_BASE}/auth/me`, () => {
    return HttpResponse.json<UserResponse>({
      id: '1',
      email: 'user@example.com',
      username: 'updated-user',
      role: 'USER',
      tier: 'free',
      is_active: true,
      email_verified: false
    })
  }),

  // Change password
  http.post(`${API_BASE}/auth/change-password`, () => {
    return HttpResponse.json({ message: 'Password changed successfully' })
  }),

  // Refresh token
  http.post(`${API_BASE}/auth/refresh`, () => {
    return HttpResponse.json<TokenPair>({
      access_token: 'new-mock-access-token',
      refresh_token: 'new-mock-refresh-token',
      token_type: 'bearer',
      expires_in: 3600
    })
  }),

  // Add more handlers as needed for your API endpoints
]
