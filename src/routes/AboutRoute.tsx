import { ArticleLayout } from '../components/layout/ArticleLayout'
import { Code, Ext, Li, List } from '../components/ui/Prose'

export function AboutRoute() {
  return (
    <ArticleLayout title="About">
      <p>
        MTG Print Proxy turns a decklist into a print-ready PDF. Paste a list in MTG Arena or
        Moxfield format, pick the printing you want for any card, and download a sheet laid out 9
        cards to a page at true size — <strong>63 × 88 mm</strong>, the real dimensions of a Magic
        card.
      </p>
      <p>
        Card data and artwork come from <Ext href="https://scryfall.com">Scryfall</Ext>. The entire
        app runs in your browser: there is no server, and nothing you paste is uploaded anywhere.
      </p>
      <List>
        <Li>
          <strong>Set and collector number</strong> decide the printing, so{' '}
          <Code>1 Esper Sentinel (PLST) MH2-12</Code> resolves exactly.
        </Li>
        <Li>
          <strong>Double-faced cards</strong> print both faces in adjacent slots. Cards that merely
          have two names — adventures, sagas, split cards — stay a single card.
        </Li>
        <Li>
          <strong>Quantities</strong> are respected, and repeated art is embedded once, so a deck
          full of basics does not bloat the PDF.
        </Li>
        <Li>
          <strong>Print at “Actual size” or 100%</strong>, never “Fit to page”. Fitting silently
          shrinks the sheet and the cards will not fit sleeves.
        </Li>
      </List>
      <p>
        Proxies printed here are for playtesting and casual games. Please read the{' '}
        <a href="/legal.html" className="underline underline-offset-2">
          legal notices
        </a>{' '}
        before using them anywhere.
      </p>
    </ArticleLayout>
  )
}
