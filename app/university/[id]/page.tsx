import { redirect } from 'next/navigation'

export default async function UniversityPage({ params }: { params: Promise<{ id: string }> }) {
  // Server-side redirect: avoids a client-side mount + useEffect redirect,
  // which can cause double loading flashes on first visit (especially mobile).
  const { id } = await params
  redirect(`/?university=${id}`)
}