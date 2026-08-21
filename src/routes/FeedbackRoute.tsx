import { ArticleLayout } from '../components/layout/ArticleLayout'
import { FeedbackForm } from '../components/feedback/FeedbackForm'

export function FeedbackRoute() {
  return (
    <ArticleLayout title="Send feedback">
      <p>
        Found a card that will not resolve, a printing that looks wrong, or something that could
        work better? Tell me about it. Including the decklist line that caused the trouble makes
        it much easier to fix.
      </p>
      <FeedbackForm />
      <p className="text-xs">
        Messages are delivered by a third-party form service and are covered by the{' '}
        <a href="/privacy" className="underline underline-offset-2">
          privacy policy
        </a>
        . Only what you type here is sent.
      </p>
    </ArticleLayout>
  )
}
