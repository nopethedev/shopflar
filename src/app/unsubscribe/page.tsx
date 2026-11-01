import UnsubscribeClient from './unsubscribe-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Unsubscribe',
  robots: { index: false }
}

export default async function UnsubscribePage({ searchParams }) {
  const { token } = await searchParams
  return <UnsubscribeClient token={typeof token === 'string' ? token : ''} />
}
