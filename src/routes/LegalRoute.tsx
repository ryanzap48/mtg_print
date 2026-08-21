import { ArticleLayout } from '../components/layout/ArticleLayout'
import { Ext } from '../components/ui/Prose'

export function LegalRoute() {
  return (
    <ArticleLayout title="Legal">
      <p>
        <strong style={{ color: 'var(--text)' }}>Not for sanctioned play.</strong> The Magic
        Tournament Rules require that Authorized Game Cards be “regulation-sized, genuine Magic
        cards publicly released by Wizards of the Coast” (MTR 3.3). Printed proxies are not
        Authorized Game Cards and are prohibited in all sanctioned events. Only a Head Judge may
        issue a proxy, and only for a card damaged during that tournament (MTR 3.4). Casual
        playtesting, cubes, and Commander pods are up to the people you play with — ask first.
      </p>
      <p>
        <strong style={{ color: 'var(--text)' }}>Personal use only.</strong> Do not sell, trade, or
        distribute printed proxies, and do not present them as genuine cards. Selling counterfeit
        Magic cards infringes Wizards of the Coast’s copyrights and trademarks.
      </p>
      <p>
        <strong style={{ color: 'var(--text)' }}>Card images.</strong> Card artwork is reproduced
        whole and unmodified, including the artist credit and copyright line, per Scryfall’s{' '}
        <Ext href="https://scryfall.com/docs/api">data and image guidelines</Ext>. No part of a card
        image is cropped, distorted, recoloured, or overlaid with our own marks.
      </p>
      <p>
        This site is not produced by, endorsed by, or affiliated with Scryfall, with Wizards of the
        Coast, or with mtgprint.net.
      </p>
      <p
        className="rounded-md p-3 text-xs/5"
        style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border)' }}
      >
        MTG Print Proxy is unofficial Fan Content permitted under the{' '}
        <Ext href="https://company.wizards.com/en/legal/fancontentpolicy">Fan Content Policy</Ext>.
        Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of
        the Coast. ©Wizards of the Coast LLC.
      </p>
      <p className="text-xs">
        Magic: The Gathering and all card images are copyright Wizards of the Coast, LLC. Artwork is
        copyright its respective artists.
      </p>
    </ArticleLayout>
  )
}
