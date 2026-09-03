import { Link } from 'react-router-dom'
import { FAQS, STEPS } from '../../content/home'

/**
 * The written half of the home page, below the tool.
 *
 * The tool itself is entirely interactive, so without this the most important page on the site
 * has nothing to read: no heading, no sentence saying what it does, and nothing for a search
 * engine or an AI assistant to quote. It sits below the decklist box so it never delays the
 * paste-and-go path it exists to explain.
 */
export function HomeGuide() {
  return (
    <div className="mt-16 border-t pt-10" style={{ borderColor: 'var(--border)' }}>
      <section aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="text-xl font-semibold tracking-tight">
          How it works
        </h2>
        <ol className="mt-5 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <p
                className="text-xs font-semibold tabular-nums"
                style={{ color: 'var(--text-muted)' }}
              >
                Step {i + 1}
              </p>
              <h3 className="mt-1 text-sm font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="faq" className="mt-12">
        <h2 id="faq" className="text-xl font-semibold tracking-tight">
          Frequently asked questions
        </h2>
        <dl className="mt-5 grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {FAQS.map((faq) => (
            <div key={faq.q}>
              <dt className="text-sm font-semibold">{faq.q}</dt>
              <dd className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {faq.a}
              </dd>
            </div>
          ))}
        </dl>

        {/* Descriptive anchor text rather than "click here": these are the only in-content links
            on the site, and they are what tells a search engine what the linked page is about. */}
        <p className="mt-8 text-sm" style={{ color: 'var(--text-muted)' }}>
          More detail on{' '}
          <Link to="/about" className="underline underline-offset-4 hover:opacity-60">
            how the proxy PDF is put together
          </Link>
          , and on{' '}
          <Link to="/legal" className="underline underline-offset-4 hover:opacity-60">
            where printed proxies are and are not allowed
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
