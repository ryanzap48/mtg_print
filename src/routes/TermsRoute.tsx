import { ArticleLayout, CONTACT_EMAIL } from '../components/layout/ArticleLayout'
import { Code, H2, Li, List, Updated } from '../components/ui/Prose'

export function TermsRoute() {
  return (
    <ArticleLayout title="Terms of Service">
      <Updated />
      <p>
        By using MTG Print Proxy you agree to these terms. If you do not agree, please do not use
        the site.
      </p>

      <H2>The service</H2>
      <p>
        MTG Print Proxy is a free, non-commercial hobby project provided <strong>as is</strong> and{' '}
        <strong>as available</strong>, without warranty of any kind, express or implied, including
        fitness for a particular purpose. We do not guarantee that the site will be available, that
        card data will be accurate or current, or that printed output will match any particular size
        on your printer. We may change or discontinue it at any time without notice.
      </p>

      <H2>How you may use it</H2>
      <List>
        <Li>Personal, non-commercial use only.</Li>
        <Li>
          Do not sell, trade, or distribute cards printed with this tool, and do not present them as
          genuine cards.
        </Li>
        <Li>
          Do not use printed output in sanctioned tournament play — see the{' '}
          <a href="/legal.html" className="underline underline-offset-2">
            legal notices
          </a>
          .
        </Li>
        <Li>Do not attempt to overload, scrape, or misuse the site or the Scryfall API through it.</Li>
      </List>

      <H2>Your responsibility</H2>
      <p>
        You are solely responsible for what you print and how you use it. To the maximum extent
        permitted by law, we accept no liability for any loss or damage arising from your use of
        this site or of anything you produce with it, including wasted materials, rejected cards, or
        disputes with event organisers.
      </p>

      <H2>Intellectual property</H2>
      <p>
        We claim no ownership of Magic: The Gathering card names, artwork, or text. Those belong to
        Wizards of the Coast and the respective artists.
      </p>

      <H2>Contact</H2>
      <p>
        Questions about these terms: <Code>{CONTACT_EMAIL}</Code>.
      </p>
    </ArticleLayout>
  )
}
