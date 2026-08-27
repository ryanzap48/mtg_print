import { CookieSettingsLink } from '../components/layout/ConsentBanner'
import { ArticleLayout, CONTACT_EMAIL } from '../components/layout/ArticleLayout'
import { Code, DataTable, Ext, H2, Li, List, Updated } from '../components/ui/Prose'

export function PrivacyRoute() {
  return (
    <ArticleLayout title="Privacy Policy">
      <Updated />
      <p>
        The short version: <strong>your decklists never leave your device.</strong> There is no
        server and no account. Card lookups go directly from your browser to Scryfall. The only
        optional data collection is Google Analytics, which runs only if you accept it.
      </p>

      <H2>What is stored on your device</H2>
      <p>
        The app saves a few things locally so it can work. None of it is transmitted, and none of it
        identifies you. Clearing your browser’s site data removes all of it.
      </p>
      <DataTable
        head={['What', 'Where', 'Why']}
        rows={[
          ['Your decklist', 'localStorage', 'Restores your list if you reload'],
          ['Print options', 'localStorage', 'Remembers paper size, bleed, quality'],
          ['Cookie choice', 'localStorage', 'Remembers whether you accepted analytics'],
          ['Card data cache', 'IndexedDB', 'Avoids re-fetching cards you already looked up'],
        ]}
      />
      <p>
        These are strictly necessary to provide the features you asked for, so they are used without
        a consent prompt. They are not cookies, are not shared, and are not used to track you.
      </p>

      <H2>Google Analytics (optional)</H2>
      <p>
        If you accept, we load Google Analytics 4, which sets <Code>_ga</Code> and{' '}
        <Code>_ga_&lt;id&gt;</Code> cookies and collects your approximate location (derived from a
        truncated IP address), device and browser type, pages viewed, and referring site. We use it
        only to see which parts of the site get used. All advertising features are disabled and IP
        anonymisation is on.
      </p>
      <p>
        <strong>
          If you decline, no Google script is ever loaded and no analytics cookie is ever set.
        </strong>{' '}
        The site behaves identically. You can change your mind at any time: <CookieSettingsLink />.
        See also <Ext href="https://policies.google.com/privacy">Google’s Privacy Policy</Ext> and
        their <Ext href="https://tools.google.com/dlpage/gaoptout">browser opt-out add-on</Ext>.
      </p>

      <H2>Third parties that necessarily see your requests</H2>
      <List>
        <Li>
          <strong>Scryfall</strong>, your browser requests card data and images directly from{' '}
          <Code>api.scryfall.com</Code> and <Code>cards.scryfall.io</Code>. Scryfall therefore
          receives your IP address and can see which cards you look up. See{' '}
          <Ext href="https://scryfall.com/docs/privacy">Scryfall’s privacy policy</Ext>.
        </Li>
        <Li>
          <strong>Our hosting provider</strong>, like any website host, it records standard server
          logs including IP addresses, for security and reliability.
        </Li>
      </List>

      <H2>The feedback form</H2>
      <p>
        If you send feedback, the message and any name or email address you choose to include are
        passed to a third-party form service, which forwards them to us. Nothing else is attached:
        no decklist, no analytics identifier, no page history. Leaving the email field blank is
        fine; it only exists so we can reply.
      </p>

      <H2>Sharing a PDF</H2>
      <p>
        The PDF is built in your browser and stays there. Sharing it hands the file to your
        device's own share sheet, which passes it directly to whichever app you choose. It is not
        uploaded to this site, and there is no server here that could receive it. The social
        buttons are different: they open that network in a new tab with a link to this site, and
        carry no part of your deck.
      </p>

      <H2>Your rights</H2>
      <p>
        If you are in the EU, UK, or a similar jurisdiction, you have the right to access, correct,
        or delete personal data we hold, to object to or restrict processing, and to withdraw
        consent at any time. Because we hold no accounts and store nothing on a server, in practice
        this means: clear your browser data to erase local storage, and use <CookieSettingsLink /> to
        withdraw analytics consent. For anything else, contact <Code>{CONTACT_EMAIL}</Code>. You may
        also complain to your local data protection authority.
      </p>

      <H2>Children</H2>
      <p>
        This site is not directed at children under 13, and we do not knowingly collect personal
        information from them.
      </p>

      <H2>Changes</H2>
      <p>
        We may update this policy; the date above will change when we do. Material changes will
        reset the analytics consent prompt.
      </p>
    </ArticleLayout>
  )
}
