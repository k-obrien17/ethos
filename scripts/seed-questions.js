import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load .env.local manually (no dotenv dependency)
const envFile = readFileSync('.env.local', 'utf8')
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) process.env[match[1].trim()] = match[2].trim()
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
}

// Generate dates: 7 days ago through 5 days from now
function dateOffset(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const questions = [
  // Past questions (published)
  { body: 'What belief have you changed your mind about in the last year?', category: 'Growth', offset: -7 },
  { body: 'What is the most underrated skill in your industry?', category: 'Industry', offset: -6 },
  { body: 'If you could only give one piece of career advice, what would it be?', category: 'Career', offset: -5 },
  { body: 'What problem are most people in your field ignoring?', category: 'Industry', offset: -4 },
  { body: 'What daily habit has had the biggest impact on your work?', category: 'Productivity', offset: -3 },
  { body: 'When was the last time you were wrong about something important?', category: 'Leadership', offset: -2 },
  { body: 'What would you build if you had unlimited resources and one year?', category: 'Vision', offset: -1 },

  // Today
  { body: 'What is the hardest trade-off you have made as a leader?', category: 'Leadership', offset: 0 },

  // Upcoming (scheduled)
  { body: 'What technology trend do you think is overhyped right now?', category: 'Technology', offset: 1 },
  { body: 'How do you decide when to say no to an opportunity?', category: 'Strategy', offset: 2 },
  { body: 'What book or idea fundamentally changed how you think?', category: 'Growth', offset: 3 },
  { body: 'What is the biggest misconception about your area of expertise?', category: 'Industry', offset: 4 },
  { body: 'How do you measure success beyond revenue and growth?', category: 'Values', offset: 5 },
]

async function seed() {
  console.log('Seeding questions...\n')

  for (const q of questions) {
    const publish_date = dateOffset(q.offset)
    const status = q.offset <= 0 ? 'scheduled' : 'scheduled'
    const slug = slugify(q.body)

    const { error } = await supabase
      .from('questions')
      .insert({
        body: q.body,
        slug,
        category: q.category,
        publish_date,
        status,
      })

    if (error) {
      if (error.code === '23505') {
        console.log(`  SKIP  ${publish_date}  ${q.body.slice(0, 50)}... (already exists)`)
      } else {
        console.log(`  ERROR ${publish_date}  ${error.message}`)
      }
    } else {
      const label = q.offset > 0 ? 'upcoming' : q.offset === 0 ? 'TODAY' : 'past'
      console.log(`  OK    ${publish_date}  [${label}] ${q.body.slice(0, 50)}...`)
    }
  }

  console.log('\nDone! Visit http://localhost:3000 to see today\'s question.')
}

seed()
