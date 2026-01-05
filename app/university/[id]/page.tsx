import { redirect } from 'next/navigation'

export default function UniversityPage({ params }: { params: { id: string } }) {
  // Server-side redirect: avoids a client-side mount + useEffect redirect,
  // which can cause double loading flashes on first visit (especially mobile).
  redirect(`/?university=${params.id}`)
}