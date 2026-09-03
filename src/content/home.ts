import content from './home.json'

/**
 * The home page's written content, in one place.
 *
 * Held as JSON rather than as TypeScript so the build scripts can read the same file: the
 * visible page, the FAQPage structured data and llms.txt are all generated from it. What a
 * search engine or an AI assistant is told can then never drift from what a visitor reads,
 * which is the usual way FAQ markup goes wrong and is treated as cloaking.
 *
 * Answers are plain sentences on purpose. They are quoted verbatim in rich results and by
 * assistants summarising the page, so each has to stand on its own without the surrounding page.
 */

export interface Step {
  title: string
  body: string
}

export interface Faq {
  q: string
  a: string
}

export const TAGLINE: string = content.tagline
export const STEPS: Step[] = content.steps
export const FAQS: Faq[] = content.faqs
