// Seed script: applies migration 00013 and inserts test data for search
// Usage: node scripts/seed-search.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load .env.local manually
const envContent = readFileSync('.env.local', 'utf-8')
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) process.env[match[1].trim()] = match[2].trim()
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Step 1: Apply migration via SQL
const migrationSQL = readFileSync('supabase/migrations/00013_search_indexes.sql', 'utf-8')

// Split migration into individual statements (split on semicolons not inside $$ blocks)
function splitSQL(sql) {
  const statements = []
  let current = ''
  let inDollarQuote = false

  const lines = sql.split('\n')
  for (const line of lines) {
    // Skip comments
    if (line.trim().startsWith('--') && !inDollarQuote) {
      current += line + '\n'
      continue
    }

    if (line.includes('$$')) {
      const count = (line.match(/\$\$/g) || []).length
      if (count % 2 === 1) {
        inDollarQuote = !inDollarQuote
      }
    }

    current += line + '\n'

    if (!inDollarQuote && line.trim().endsWith(';')) {
      const stmt = current.trim()
      if (stmt && !stmt.match(/^--/)) {
        statements.push(stmt)
      }
      current = ''
    }
  }

  if (current.trim()) {
    statements.push(current.trim())
  }

  return statements
}

console.log('Applying migration 00013_search_indexes.sql...')

const statements = splitSQL(migrationSQL)
for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i]
  if (!stmt.trim() || stmt.trim().match(/^--/)) continue

  const { error } = await supabase.rpc('exec_sql', { sql: stmt }).maybeSingle()
  if (error) {
    // Try direct approach if exec_sql doesn't exist
    // We'll use the postgres connection via supabase-js admin
    console.log(`  Statement ${i + 1}/${statements.length}: Skipping RPC approach, will seed data only`)
    break
  }
  console.log(`  Statement ${i + 1}/${statements.length}: OK`)
}

// Step 2: Check if search_content RPC exists by calling it
console.log('\nChecking if search_content RPC exists...')
const { data: testSearch, error: rpcError } = await supabase.rpc('search_content', {
  search_query: 'test',
  filter_type: null,
  filter_topic_id: null,
  filter_date_range: null,
  result_limit: 1,
  result_offset: 0,
})

if (rpcError) {
  console.log('\n⚠ Migration not applied yet. Please apply it manually:')
  console.log('  1. Open Supabase Dashboard → SQL Editor')
  console.log('  2. Paste contents of supabase/migrations/00013_search_indexes.sql')
  console.log('  3. Click "Run"')
  console.log('  4. Re-run this script: node scripts/seed-search.mjs')
  console.log(`\n  RPC error: ${rpcError.message}`)
  process.exit(1)
}

console.log('✓ search_content RPC is available')

// Step 3: Check existing data
const { count: qCount } = await supabase.from('questions').select('*', { count: 'exact', head: true })
const { count: pCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
const { count: aCount } = await supabase.from('answers').select('*', { count: 'exact', head: true })

console.log(`\nExisting data: ${qCount} questions, ${pCount} profiles, ${aCount} answers`)

if (qCount > 5 && pCount > 2) {
  console.log('Sufficient data exists. Testing search...')
  const { data: results } = await supabase.rpc('search_content', {
    search_query: 'leadership',
    result_limit: 5,
  })
  console.log(`Search for "leadership": ${(results || []).length} results`)

  if ((results || []).length > 0) {
    console.log('\n✓ Search is working! Results:')
    results.forEach(r => console.log(`  [${r.result_type}] ${r.title?.substring(0, 60)}...`))
    process.exit(0)
  }
  console.log('No results for "leadership", will seed additional data...')
}

// Step 4: Seed test data
console.log('\nSeeding test data...')

// Get or create test profiles
const { data: existingProfiles } = await supabase
  .from('profiles')
  .select('id, handle')
  .limit(3)

let profileIds = (existingProfiles || []).map(p => p.id)

// Get existing topics
const { data: topics } = await supabase.from('topics').select('id, name').limit(5)
const topicIds = (topics || []).map(t => t.id)

// Seed questions if needed
const seedQuestions = [
  { body: 'What leadership qualities matter most in times of uncertainty?', slug: 'leadership-qualities-uncertainty', category: 'Leadership', status: 'published', publish_date: '2026-02-20' },
  { body: 'How do you build trust with a team you just inherited?', slug: 'build-trust-inherited-team', category: 'Leadership', status: 'published', publish_date: '2026-02-18' },
  { body: 'What is the role of ethics in business decision making?', slug: 'ethics-business-decisions', category: 'Ethics', status: 'published', publish_date: '2026-02-15' },
  { body: 'How do successful leaders handle failure and setbacks?', slug: 'leaders-handle-failure', category: 'Leadership', status: 'published', publish_date: '2026-02-12' },
  { body: 'What communication strategies build the strongest teams?', slug: 'communication-strategies-teams', category: 'Communication', status: 'published', publish_date: '2026-02-10' },
  { body: 'How do you maintain integrity when facing pressure to compromise?', slug: 'maintain-integrity-pressure', category: 'Ethics', status: 'published', publish_date: '2026-02-08' },
  { body: 'What does mentorship look like in the modern workplace?', slug: 'mentorship-modern-workplace', category: 'Career', status: 'published', publish_date: '2026-02-05' },
  { body: 'How do great leaders inspire innovation in their organizations?', slug: 'leaders-inspire-innovation', category: 'Leadership', status: 'published', publish_date: '2026-02-01' },
]

for (const q of seedQuestions) {
  const { error } = await supabase.from('questions').upsert(q, { onConflict: 'slug' })
  if (error && !error.message.includes('duplicate')) {
    console.log(`  Question "${q.slug}": ${error.message}`)
  } else {
    console.log(`  ✓ Question: ${q.slug}`)
  }
}

// Get question IDs for answers
const { data: questions } = await supabase
  .from('questions')
  .select('id, slug')
  .in('slug', seedQuestions.map(q => q.slug))

// Seed answers if we have profiles and questions
if (profileIds.length > 0 && questions && questions.length > 0) {
  const seedAnswers = [
    {
      expert_id: profileIds[0],
      question_id: questions[0]?.id,
      body: 'The most critical leadership quality in uncertain times is the ability to communicate with transparency. When people don\'t know what\'s happening, they fill in the gaps with fear. A leader who shares what they know — and admits what they don\'t — builds the psychological safety teams need to perform under pressure. Empathy is second. Understanding that your team members are human beings with their own anxieties about uncertainty isn\'t weakness; it\'s wisdom.',
      word_count: 68,
    },
    {
      expert_id: profileIds[Math.min(1, profileIds.length - 1)],
      question_id: questions[2]?.id,
      body: 'Ethics in business isn\'t about following rules — it\'s about building a compass that works when there are no rules. The companies that endure are the ones where ethical decision-making is embedded in the culture, not bolted on as compliance. I\'ve seen organizations collapse not from external threats but from internal rot when leaders chose expediency over integrity. The short-term cost of doing the right thing is always less than the long-term cost of doing the wrong thing.',
      word_count: 78,
    },
    {
      expert_id: profileIds[0],
      question_id: questions[4]?.id,
      body: 'The strongest communication strategy is also the simplest: listen more than you speak. Teams don\'t need leaders who have all the answers. They need leaders who ask the right questions and then actually listen to the responses. Create regular forums — not just meetings, but genuine spaces for dialogue. When people feel heard, they give you their best thinking. When they don\'t, they give you compliance.',
      word_count: 63,
    },
  ]

  for (const a of seedAnswers) {
    if (!a.question_id) continue
    const { error } = await supabase.from('answers').insert(a)
    if (error) {
      console.log(`  Answer: ${error.message}`)
    } else {
      console.log(`  ✓ Answer seeded for question`)
    }
  }
}

// Link questions to topics if topics exist
if (topicIds.length > 0 && questions && questions.length > 0) {
  for (let i = 0; i < Math.min(questions.length, topicIds.length); i++) {
    const { error } = await supabase
      .from('question_topics')
      .upsert({ question_id: questions[i].id, topic_id: topicIds[i % topicIds.length] }, { onConflict: 'question_id,topic_id' })
    if (!error) {
      console.log(`  ✓ Linked question to topic`)
    }
  }
}

// Test search
console.log('\nTesting search...')
const { data: finalResults, error: finalError } = await supabase.rpc('search_content', {
  search_query: 'leadership',
  result_limit: 10,
})

if (finalError) {
  console.log(`Search error: ${finalError.message}`)
} else {
  console.log(`\n✓ Search for "leadership": ${(finalResults || []).length} results`)
  ;(finalResults || []).forEach(r =>
    console.log(`  [${r.result_type}] ${r.title?.substring(0, 70)}${r.title?.length > 70 ? '...' : ''}`)
  )
}

console.log('\n✓ Done! Refresh your browser at http://localhost:3002/search?q=leadership')
