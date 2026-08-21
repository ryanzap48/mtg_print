import { Link } from 'react-router-dom'
import { ArticleLayout } from '../components/layout/ArticleLayout'

export function ThanksRoute() {
  return (
    <ArticleLayout title="Thanks for the feedback">
      <p>
        Your message is on its way. It gets read, and if you left an email address you may get a
        reply.
      </p>
      <p>
        <Link to="/" className="underline underline-offset-2">
          Back to the deck printer
        </Link>{' '}
        or{' '}
        <Link to="/feedback" className="underline underline-offset-2">
          send another message
        </Link>
        .
      </p>
    </ArticleLayout>
  )
}
