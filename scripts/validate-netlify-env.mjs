const isNetlifyBuild = process.env.NETLIFY === 'true'

if (!isNetlifyBuild) {
  process.exit(0)
}

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
]

const missing = required.filter((key) => !process.env[key] || String(process.env[key]).trim().length === 0)

const hasOpenAi = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0)
const hasGoogle = Boolean(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GOOGLE_GENERATIVE_AI_API_KEY.trim().length > 0,
)

if (missing.length > 0) {
  console.error('\n[Netlify Env Validation] Missing or invalid variables:')
  for (const key of missing) {
    console.error(`- ${key}`)
  }
  console.error('\nPlease configure these variables in Netlify Site settings > Environment variables.\n')
  process.exit(1)
}

const warnings = []

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
if (!siteUrl) {
  warnings.push('NEXT_PUBLIC_SITE_URL is not set (OAuth should still work via window.location.origin).')
} else if (!siteUrl.startsWith('https://')) {
  warnings.push('NEXT_PUBLIC_SITE_URL should start with https:// for production environments.')
}

if (!hasOpenAi && !hasGoogle) {
  warnings.push('No AI API key set. AI parse feature will run in fallback/basic mode.')
}

if (warnings.length > 0) {
  console.warn('\n[Netlify Env Validation] Warnings:')
  for (const message of warnings) {
    console.warn(`- ${message}`)
  }
  console.warn('')
}

console.log('[Netlify Env Validation] OK')
