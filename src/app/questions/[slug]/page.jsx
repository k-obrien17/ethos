import { redirect } from 'next/navigation'

export default async function QuestionSlugRedirect({ params }) {
  const { slug } = await params
  redirect(`/q/${slug}`)
}
