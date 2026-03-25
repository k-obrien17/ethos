import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// 10 additional demo experts for leaderboard variety
const newExperts = [
  { email: 'demo-alex@ethos.local', display_name: 'Alex Thornton', handle: 'alex-thornton', headline: 'CTO, Runway Labs', organization: 'Runway Labs', bio: 'Full-stack turned executive. Building tools for creative teams.' },
  { email: 'demo-nina@ethos.local', display_name: 'Nina Alvarez', handle: 'nina-alvarez', headline: 'Head of Product, Notion', organization: 'Notion', bio: 'Product leader obsessed with simplicity. Previously Figma and Airbnb.' },
  { email: 'demo-david@ethos.local', display_name: 'David Park', handle: 'david-park', headline: 'Founder, Sunbeam Analytics', organization: 'Sunbeam Analytics', bio: 'Data infrastructure nerd. Helping companies make sense of their numbers.' },
  { email: 'demo-amara@ethos.local', display_name: 'Amara Williams', handle: 'amara-williams', headline: 'VP People, Stripe', organization: 'Stripe', bio: 'Building cultures where ambitious people do their best work.' },
  { email: 'demo-raj@ethos.local', display_name: 'Raj Patel', handle: 'raj-patel', headline: 'General Partner, Sequoia Capital', organization: 'Sequoia Capital', bio: 'Enterprise SaaS investor. 12 unicorns and counting.' },
  { email: 'demo-kate@ethos.local', display_name: 'Kate Morrison', handle: 'kate-morrison', headline: 'CEO, Parallel Health', organization: 'Parallel Health', bio: 'Second-time founder. Bringing precision medicine to primary care.' },
  { email: 'demo-omar@ethos.local', display_name: 'Omar Hassan', handle: 'omar-hassan', headline: 'Director of Engineering, Shopify', organization: 'Shopify', bio: 'Scaling systems and teams. Formerly Google and Meta.' },
  { email: 'demo-lisa@ethos.local', display_name: 'Lisa Chang', handle: 'lisa-chang', headline: 'Chief Revenue Officer, Gong', organization: 'Gong', bio: 'Revenue leader who believes in data-driven selling and authentic relationships.' },
  { email: 'demo-tom@ethos.local', display_name: 'Tom Brennan', handle: 'tom-brennan', headline: 'Principal, Andreessen Horowitz', organization: 'Andreessen Horowitz', bio: 'Investing in the future of work. Board observer at 8 companies.' },
  { email: 'demo-maya@ethos.local', display_name: 'Maya Singh', handle: 'maya-singh', headline: 'SVP Strategy, HubSpot', organization: 'HubSpot', bio: 'Connecting go-to-market strategy with product-led growth.' },
]

// Short, punchy answers for each expert across various questions
const answerTemplates = [
  'The conventional wisdom here is wrong. What actually matters is building systems that compound — not just hitting quarterly targets. I learned this the hard way after watching three high-growth companies stall because they optimized for metrics instead of momentum.',
  'Speed kills — in a good way. The teams I see winning are the ones making decisions in hours, not weeks. Perfect information is a myth. You need enough signal to move, then the discipline to adjust when reality talks back.',
  'Culture is not about perks or mission statements. It is about what happens when no one is watching. Do people escalate problems or hide them? That single behavior predicts more about a company than any engagement survey.',
  'I used to think hiring was about finding the best person for the role. Now I think it is about finding the person who will make everyone around them better. Individual brilliance matters less than catalytic effect.',
  'The best strategy I have ever seen fit on one page. If your strategy requires a 50-slide deck to explain, you do not have a strategy. You have a wish list.',
  'Retention is a leading indicator that most people treat as a lagging one. By the time someone leaves, you have already lost the battle. The real question is: are your best people energized today?',
  'Data without narrative is noise. Numbers tell you what happened. Stories tell you why it matters. The leaders who combine both are the ones who actually drive change.',
  'The hardest part of leadership is not making the right call. It is making any call when the stakes are high and the data is ambiguous. Indecision is the silent killer of good companies.',
  'I have seen more companies die from consensus than from bold mistakes. When everyone agrees, either the problem is trivial or nobody is thinking hard enough.',
  'The moat everyone overlooks: operational excellence. It is not sexy. It does not make headlines. But the company that executes 20% faster than competitors wins in every market, every time.',
  'Trust is built in small moments, not grand gestures. Every time you follow through on a small commitment — reply when you said you would, ship when you promised — you are building the foundation for the big asks.',
  'Most people overvalue new ideas and undervalue consistent execution. The best companies I have invested in did not have the most original thesis. They just executed with relentless consistency.',
]

async function seed() {
  console.log('Fetching existing experts...')
  const { data: existingProfiles } = await supabase.from('profiles').select('id, handle')
  const existingHandles = new Set((existingProfiles || []).map(p => p.handle))

  console.log('Fetching questions...')
  const { data: questions } = await supabase.from('questions').select('id, body')
  if (!questions || questions.length === 0) {
    console.error('No questions found. Run seed-questions first.')
    return
  }

  const allProfileIds = (existingProfiles || []).map(p => p.id)

  // Create new experts
  console.log('\nCreating new experts...')
  for (const expert of newExperts) {
    if (existingHandles.has(expert.handle)) {
      const existing = existingProfiles.find(p => p.handle === expert.handle)
      if (existing) allProfileIds.push(existing.id)
      console.log(`  ~ ${expert.display_name} (exists)`)
      continue
    }

    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: expert.email,
      password: 'demo-password-not-for-login',
      email_confirm: true,
      user_metadata: { full_name: expert.display_name },
    })

    if (authErr) {
      console.error(`  x ${expert.display_name}: ${authErr.message}`)
      continue
    }

    const userId = authData.user.id
    allProfileIds.push(userId)

    await supabase.from('profiles').update({
      display_name: expert.display_name,
      handle: expert.handle,
      headline: expert.headline,
      organization: expert.organization,
      bio: expert.bio,
      answer_limit: 3,
    }).eq('id', userId)

    console.log(`  + ${expert.display_name}`)
  }

  // Seed answers — each expert answers 3-8 random questions
  console.log('\nSeeding answers...')
  let answerCount = 0

  for (const profileId of allProfileIds) {
    const numAnswers = 3 + Math.floor(Math.random() * 6) // 3-8
    const shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, numAnswers)

    for (const question of shuffled) {
      const template = answerTemplates[Math.floor(Math.random() * answerTemplates.length)]
      const wordCount = template.split(/\s+/).filter(Boolean).length

      const { error } = await supabase.from('answers').insert({
        expert_id: profileId,
        question_id: question.id,
        body: template,
        word_count: wordCount,
      })

      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('idx_answers')) {
          // Already answered, skip
        } else {
          console.error(`  x ${error.message}`)
        }
      } else {
        answerCount++
      }
    }
  }
  console.log(`  + ${answerCount} answers created`)

  // Add likes to make leaderboard interesting
  console.log('\nSeeding likes...')
  const { data: allAnswers } = await supabase.from('answers').select('id, expert_id')
  let likeCount = 0

  for (const answer of allAnswers || []) {
    // Random number of likes (0-12) per answer
    const numLikes = Math.floor(Math.random() * 13)

    if (numLikes > 0) {
      const { error } = await supabase
        .from('answers')
        .update({ like_count: numLikes })
        .eq('id', answer.id)

      if (!error) likeCount++
    }
  }
  console.log(`  + Updated like counts on ${likeCount} answers`)

  console.log('\nDone! Leaderboard should now be populated.')
}

seed().catch(console.error)
