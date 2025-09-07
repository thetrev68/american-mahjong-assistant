// Feature Flags & Environment Configuration
// Centralized configuration management for production vs development

export interface FeatureFlags {
  // Core Features
  enableMultiplayer: boolean
  enableAnalytics: boolean
  enableErrorTracking: boolean
  enablePerformanceMonitoring: boolean
  
  // Development Features
  enableDebugMode: boolean
  enableDeveloperTools: boolean
  bundleAnalyzer: boolean
  
  // PWA Features
  enablePWA: boolean
  enableServiceWorker: boolean
  
  // Security Features
  enableContentSecurityPolicy: boolean
  trustDevCert: boolean
  
  // Performance Limits
  apiRateLimit: number
  apiBurstLimit: number
}

export interface AppConfig {
  name: string
  version: string
  environment: 'development' | 'production' | 'staging'
  backendUrl: string
  websocketUrl: string
  
  // Analytics IDs
  googleAnalyticsId?: string
  hotjarId?: string
  sentryDsn?: string
}

// Environment variable helpers with defaults
const getEnvVar = (key: string, defaultValue: string = ''): string => {
  return import.meta.env[key] || defaultValue
}

const getEnvBool = (key: string, defaultValue: boolean = false): boolean => {
  const value = import.meta.env[key]
  if (value === undefined) return defaultValue
  return value === 'true'
}

const getEnvNumber = (key: string, defaultValue: number = 0): number => {
  const value = import.meta.env[key]
  if (value === undefined) return defaultValue
  return parseInt(value, 10) || defaultValue
}

// Feature Flags Configuration
export const featureFlags: FeatureFlags = {
  // Core Features
  enableMultiplayer: getEnvBool('VITE_ENABLE_MULTIPLAYER', true),
  enableAnalytics: getEnvBool('VITE_ENABLE_ANALYTICS', false),
  enableErrorTracking: getEnvBool('VITE_ENABLE_ERROR_TRACKING', false),
  enablePerformanceMonitoring: getEnvBool('VITE_ENABLE_PERFORMANCE_MONITORING', false),
  
  // Development Features  
  enableDebugMode: getEnvBool('VITE_ENABLE_DEBUG_MODE', import.meta.env.DEV),
  enableDeveloperTools: getEnvBool('VITE_ENABLE_DEVELOPER_TOOLS', import.meta.env.DEV),
  bundleAnalyzer: getEnvBool('VITE_BUNDLE_ANALYZER', false),
  
  // PWA Features
  enablePWA: getEnvBool('VITE_ENABLE_PWA', false),
  enableServiceWorker: getEnvBool('VITE_ENABLE_SERVICE_WORKER', false),
  
  // Security Features
  enableContentSecurityPolicy: getEnvBool('VITE_ENABLE_CONTENT_SECURITY_POLICY', false),
  trustDevCert: getEnvBool('VITE_TRUST_DEV_CERT', import.meta.env.DEV),
  
  // Performance Limits
  apiRateLimit: getEnvNumber('VITE_API_RATE_LIMIT', 100),
  apiBurstLimit: getEnvNumber('VITE_API_BURST_LIMIT', 20),
}

// Application Configuration
export const appConfig: AppConfig = {
  name: getEnvVar('VITE_APP_NAME', 'American Mahjong Assistant'),
  version: getEnvVar('VITE_APP_VERSION', '1.0.0'),
  environment: getEnvVar('VITE_APP_ENVIRONMENT', 'development') as AppConfig['environment'],
  backendUrl: getEnvVar('VITE_BACKEND_URL', 'http://localhost:5000'),
  websocketUrl: getEnvVar('VITE_WEBSOCKET_URL', 'ws://localhost:5000'),
  
  // Analytics (only if provided)
  ...(getEnvVar('VITE_GOOGLE_ANALYTICS_ID') && {
    googleAnalyticsId: getEnvVar('VITE_GOOGLE_ANALYTICS_ID')
  }),
  ...(getEnvVar('VITE_HOTJAR_ID') && {
    hotjarId: getEnvVar('VITE_HOTJAR_ID')
  }),
  ...(getEnvVar('VITE_SENTRY_DSN') && {
    sentryDsn: getEnvVar('VITE_SENTRY_DSN')
  }),
}

// Environment Checks
export const isDevelopment = appConfig.environment === 'development'
export const isProduction = appConfig.environment === 'production'
export const isStaging = appConfig.environment === 'staging'

// Feature Flag Utilities
export const shouldEnableFeature = (feature: keyof FeatureFlags): boolean => {
  return featureFlags[feature] === true
}

export const getFeatureConfig = <T>(feature: keyof FeatureFlags, config: T): T | null => {
  return shouldEnableFeature(feature) ? config : null
}

// Debug Information (only in development)
if (isDevelopment && featureFlags.enableDebugMode) {
  console.group('🏗️ Application Configuration')
  console.log('App Config:', appConfig)
  console.log('Feature Flags:', featureFlags)
  console.log('Environment:', {
    isDevelopment,
    isProduction,
    isStaging,
    DEV: import.meta.env.DEV
  })
  console.groupEnd()
}