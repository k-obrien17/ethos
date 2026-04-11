import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// 5 fictional demo experts
const experts = [
  {
    email: 'demo-sarah@credo.local',
    display_name: 'Sarah Chen',
    handle: 'sarah-chen',
    headline: 'COO, Meridian Ventures',
    organization: 'Meridian Ventures',
    bio: 'Operator turned investor. 15 years scaling B2B startups from seed to Series C. I think a lot about org design and when to break things that are working.',
    answer_limit: 3,
  },
  {
    email: 'demo-marcus@credo.local',
    handle: 'marcus-reid',
    display_name: 'Marcus Reid',
    headline: 'VP Engineering, Lattice',
    organization: 'Lattice',
    bio: 'Engineering leader. Previously built infra at Stripe and Datadog. Obsessed with developer experience and the craft of technical leadership.',
    answer_limit: 3,
  },
  {
    email: 'demo-priya@credo.local',
    handle: 'priya-kapoor',
    display_name: 'Priya Kapoor',
    headline: 'Founder & CEO, Tidal Health',
    organization: 'Tidal Health',
    bio: 'Building the future of preventive healthcare. Former McKinsey. I believe the best companies are built on hard truths, not comfortable narratives.',
    answer_limit: 3,
  },
  {
    email: 'demo-james@credo.local',
    handle: 'james-okonkwo',
    display_name: 'James Okonkwo',
    headline: 'Chief Strategy Officer, Redpoint Global',
    organization: 'Redpoint Global',
    bio: 'Strategy and growth at the intersection of data and decision-making. Spent a decade in consulting before going in-house. I write about strategy that actually works.',
    answer_limit: 3,
  },
  {
    email: 'demo-elena@credo.local',
    handle: 'elena-vasquez',
    display_name: 'Elena Vasquez',
    headline: 'Managing Director, First Round Capital',
    organization: 'First Round Capital',
    bio: 'Early-stage investor backing technical founders. Board member at 6 companies. I care about founder psychology and the decisions that compound.',
    answer_limit: 3,
  },
]

// Answers keyed by question body substring → [{ expertIndex, body }]
const answers = [
  {
    question: 'measure success beyond revenue',
    responses: [
      {
        expert: 0,
        body: `Revenue is a lagging indicator. By the time it shows up, the decisions that caused it are 12-18 months old.

The metrics I actually watch: retention of top performers (are your best people staying?), time-to-decision (is the org getting faster or slower?), and what I call "voluntary surface area" — are people proactively taking on problems outside their job description?

When those three are healthy, revenue follows. When they're not, no amount of sales optimization saves you.`,
      },
      {
        expert: 3,
        body: `I track what I call "strategic optionality." Are we making decisions that open doors or close them?

A company can hit its revenue targets and still be dying — if every deal requires more customization, if the product roadmap is entirely customer-driven, if your best engineers are doing maintenance instead of building.

The question I ask every quarter: "Are we more free or less free than we were 90 days ago?" If less free, something is wrong regardless of what the P&L says.`,
      },
    ],
  },
  {
    question: 'biggest misconception about your area',
    responses: [
      {
        expert: 1,
        body: `That engineering leadership is about technical decisions.

Maybe 20% of the job is technical. The rest is organizational design, hiring judgment, managing energy (yours and your team's), and learning to say "I don't know" faster than anyone else in the room.

The best engineering leaders I know are not the best engineers. They're the ones who figured out that their job is to make other people's work possible, not to do the work themselves.`,
      },
      {
        expert: 4,
        body: `That VCs pick winners.

We don't. We pick people, and sometimes those people build something extraordinary. Most of the time, the company that succeeds looks nothing like the pitch deck we funded. The founder pivoted, the market shifted, a competitor died unexpectedly.

Our real job is pattern-matching on founders, not on markets. And even at that, we're wrong more often than we're right. The math only works because the wins are enormous.`,
      },
    ],
  },
  {
    question: 'book or idea fundamentally changed',
    responses: [
      {
        expert: 2,
        body: `"Thinking in Systems" by Donella Meadows. I read it in my second year at McKinsey and it rewired how I approach every problem.

Before that book, I thought about problems linearly — cause and effect, input and output. Meadows taught me that most important problems are circular. The output becomes the input. Feedback loops dominate. And the highest-leverage interventions are almost never where you'd intuitively look.

I've used that mental model every day since — in healthcare, in company building, in hiring. Find the loop, change the loop.`,
      },
    ],
  },
  {
    question: 'when to say no to an opportunity',
    responses: [
      {
        expert: 0,
        body: `My rule: if it's not a clear yes within 72 hours, it's a no.

I used to agonize over opportunities. I'd make spreadsheets, talk to advisors, sleep on it for weeks. What I learned is that the best opportunities — the ones that actually changed my career — were obvious almost immediately. Not easy, but obvious.

The ones I had to convince myself to do? Those were the ones that consumed 18 months and taught me expensive lessons about the difference between "interesting" and "aligned."`,
      },
      {
        expert: 3,
        body: `I use a framework I stole from a mentor: "Does this make my current strategy better, or does it require a new strategy?"

If it makes my current strategy better — even if it's hard — say yes. If it requires a fundamentally new strategy, you're not evaluating an opportunity. You're evaluating a pivot. And pivots deserve a completely different decision process than opportunities.

Most people say yes to pivots disguised as opportunities. That's how you end up spread thin and directionless.`,
      },
      {
        expert: 4,
        body: `I say no to almost everything. Not because I'm disciplined — because I've been burned.

Early in my career I said yes to a board seat because the founder was charismatic and the market was hot. I ignored the fact that the company's unit economics made no sense. I spent two years in board meetings watching smart people try to will a broken model into working.

Now my filter is simple: does the underlying model work without heroics? If the answer requires "if we just..." then the answer is no.`,
      },
    ],
  },
  {
    question: 'technology trend.*overhyped',
    responses: [
      {
        expert: 1,
        body: `AI agents.

Not AI itself — that's real and transformative. But the current narrative that autonomous AI agents will replace entire job functions within 12 months is disconnected from engineering reality.

I run engineering teams that are actively building with LLMs. The technology is incredible for augmentation. It's terrible at autonomy. It hallucinates, it can't maintain context across complex workflows, and it fails silently in ways that are extremely expensive to debug.

We'll get there eventually. But the timeline people are selling is fantasy, and I say that as someone who is genuinely bullish on the technology.`,
      },
    ],
  },
  {
    question: 'hardest trade-off you have made as a leader',
    responses: [
      {
        expert: 2,
        body: `Letting go of my co-founder.

We'd built Tidal together from a napkin sketch. She was brilliant, creative, and the reason we had our first 10 customers. But as we scaled past 50 people, the things that made her great in the early days — moving fast, making gut calls, ignoring process — were actively hurting the company.

I spent six months trying to coach, restructure, redefine her role. Nothing worked. The conversation was the hardest thing I've done professionally. We're still friends, but barely.

The lesson: the person who helps you build the thing is not always the person who helps you run the thing. And waiting too long to face that costs everyone more.`,
      },
    ],
  },
  {
    question: 'wrong about something important',
    responses: [
      {
        expert: 3,
        body: `I was wrong about remote work. Completely wrong.

In 2020, I was convinced remote work was temporary — a pandemic accommodation that would snap back. I advised three portfolio companies to plan for full return-to-office by 2022.

Those three companies all lost key people. One lost their entire senior engineering team to a competitor that went remote-first.

What I missed was that remote work wasn't just a location preference. It was a values signal. The best people wanted autonomy, and companies that offered it won the talent war. I was optimizing for proximity when the market was optimizing for trust.`,
      },
    ],
  },
  {
    question: 'daily habit.*biggest impact',
    responses: [
      {
        expert: 0,
        body: `Writing for 20 minutes before I open email or Slack.

Not journaling — writing about whatever problem I'm stuck on. Sometimes it's a strategy question. Sometimes it's a people issue. Sometimes it's "why am I dreading this meeting?"

The key is doing it before the world's agenda replaces your own. By 9am, you're reacting. At 6:30am, you're still thinking. That distinction matters more than any productivity system I've tried.

I've done this for four years. Half of my best decisions started in that window.`,
      },
    ],
  },
  {
    question: 'leadership qualities matter most',
    responses: [
      {
        expert: 4,
        body: `The willingness to be visibly uncertain.

Most leadership advice is about projecting confidence. And yes, people need to believe you have a direction. But in genuinely uncertain times — and most times are genuinely uncertain — the leaders who pretend to have answers lose credibility the fastest.

The best leaders I've backed say: "Here's what I know, here's what I don't, here's what we're going to do to learn faster." That combination of honesty and agency is rare and magnetic. People will follow you into ambiguity if they trust you're not faking it.`,
      },
      {
        expert: 1,
        body: `Decisiveness without ego.

The ability to make a call with incomplete information, communicate it clearly, and then change course without defensiveness when new data arrives.

I've watched brilliant leaders fail because they couldn't separate their identity from their decisions. Every reversal felt like a personal defeat. Their teams learned to never bring bad news.

The best leaders I've worked for treated decisions like hypotheses. "We're going to try X. If we see Y, we'll adjust." That framing made the whole org faster because nobody was afraid to surface problems.`,
      },
    ],
  },
  {
    question: 'career advice',
    responses: [
      {
        expert: 2,
        body: `Work for someone who is great at the thing you want to be great at. Not someone who manages well, not someone with a good title, not someone at a prestigious company. Someone who is genuinely excellent at the specific craft you care about.

I learned more in 18 months working for a brilliant operator at a no-name startup than I did in 3 years at McKinsey. Not because McKinsey was bad — because proximity to mastery is the fastest teacher.

Your career is shaped more by who you sit next to than by what company name is on your badge.`,
      },
    ],
  },
]

async function seed() {
  console.log('Creating demo expert accounts...')

  const profileIds = []

  for (const expert of experts) {
    // Create auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: expert.email,
      password: 'demo-password-not-for-login',
      email_confirm: true,
      user_metadata: { full_name: expert.display_name },
    })

    if (authErr) {
      if (authErr.message.includes('already been registered')) {
        const { data: { users } } = await supabase.auth.admin.listUsers()
        const existing = users.find(u => u.email === expert.email)
        if (existing) {
          profileIds.push(existing.id)
          console.log(`  ✓ ${expert.display_name} (exists)`)
          continue
        }
      }
      console.error(`  ✗ ${expert.display_name}: ${authErr.message}`)
      continue
    }

    const userId = authData.user.id
    profileIds.push(userId)

    // Update profile (trigger creates it, we update fields)
    await supabase
      .from('profiles')
      .update({
        display_name: expert.display_name,
        handle: expert.handle,
        headline: expert.headline,
        organization: expert.organization,
        bio: expert.bio,
        answer_limit: expert.answer_limit,
      })
      .eq('id', userId)

    console.log(`  ✓ ${expert.display_name}`)
  }

  // Fetch all questions
  const { data: questions } = await supabase
    .from('questions')
    .select('id, body')

  console.log('\nSeeding answers...')

  for (const answerGroup of answers) {
    const question = questions.find(q =>
      new RegExp(answerGroup.question, 'i').test(q.body)
    )
    if (!question) {
      console.log(`  ✗ No question matching: ${answerGroup.question}`)
      continue
    }

    for (const response of answerGroup.responses) {
      const expertId = profileIds[response.expert]
      if (!expertId) continue

      const wordCount = response.body.split(/\s+/).filter(Boolean).length

      const { error } = await supabase
        .from('answers')
        .insert({
          expert_id: expertId,
          question_id: question.id,
          body: response.body,
          word_count: wordCount,
        })

      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('idx_answers_expert_question')) {
          console.log(`  ~ ${experts[response.expert].display_name} already answered: ${question.body.slice(0, 50)}...`)
        } else {
          console.log(`  ✗ ${error.message}`)
        }
      } else {
        console.log(`  ✓ ${experts[response.expert].display_name} → ${question.body.slice(0, 50)}...`)
      }
    }
  }

  console.log('\nDone! Seeded demo content.')
}

seed().catch(console.error)
