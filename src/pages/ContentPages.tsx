import { ContentPage, SOURCE_URL } from "../Layout";
import { Link } from "../router";

export function HowItWorksPage() {
  return (
    <ContentPage
      eyebrow="How it works"
      title="From government spreadsheet to searchable answers"
      lead="Maple Atlas turns the Government of Canada's published grants and contributions into a search tool that counts every agreement once and groups funding by recipient."
    >
      <section>
        <h2>The pipeline</h2>
        <ol className="steps">
          <li>
            <strong>Published by the government</strong>
            <p>
              Federal departments publish their grants and contributions over $25,000 in the{" "}
              <a href={SOURCE_URL}>Proactive Disclosure dataset</a> on open.canada.ca, updated
              quarterly. It holds over 1.3 million rows.
            </p>
          </li>
          <li>
            <strong>Cleaned and checked by Maple Forge</strong>
            <p>
              Forge downloads the full file, standardizes names, dates, amounts and provinces,
              and rejects rows that are missing required values. It keeps every amendment but
              marks the latest one, so each agreement is counted once.
            </p>
          </li>
          <li>
            <strong>Grouped by recipient</strong>
            <p>
              Agreements are grouped into recipient profiles using business numbers where they
              are reliable, and cleaned-up names otherwise. See{" "}
              <Link to="/methods">Data &amp; methods</Link> for the exact rules.
            </p>
          </li>
          <li>
            <strong>Served by the Maple Data API</strong>
            <p>
              Every search runs against the complete dataset on the server, so totals, the map
              and department figures always reflect your current filters.
            </p>
          </li>
          <li>
            <strong>Optional AI context from Maple Beacon</strong>
            <p>
              On a recipient page you can ask Beacon for a short, sourced summary of who the
              recipient is and why they may have received funding. It is clearly labelled,
              cached so it is generated only once, and held to strict rules for individuals.
            </p>
          </li>
        </ol>
      </section>

      <section>
        <h2>Search tips</h2>
        <ul className="tips">
          <li><strong>Exact phrases.</strong> Under <em>More filters</em>, set <em>Match</em> to <em>Exact phrase</em> to find “clean technology” rather than either word.</li>
          <li><strong>Search one field.</strong> Use <em>Search in</em> to look only at recipients, programs, descriptions or locations.</li>
          <li><strong>Narrow by place, department or value.</strong> Pick a province on the map or in the filters, or set a minimum value to focus on large agreements.</li>
          <li><strong>Follow the money.</strong> Select a recipient's name to see everything they received, by year and by department.</li>
          <li><strong>Share what you found.</strong> The address bar always holds your current search, so you can bookmark or send it.</li>
        </ul>
      </section>

      <section className="callout">
        <h2>Ready to look?</h2>
        <p>
          Start with a recipient, a program, a place or a topic.
        </p>
        <Link className="primary-link" to="/">Search grants</Link>
      </section>
    </ContentPage>
  );
}

export function MethodsPage() {
  return (
    <ContentPage
      eyebrow="Data & methods"
      title="What the numbers mean"
      lead="Public spending data is messy. These are the choices Maple Atlas makes, and the limits you should keep in mind when using its totals."
    >
      <section>
        <h2>Source and licence</h2>
        <p>
          All funding data comes from the Government of Canada{" "}
          <a href={SOURCE_URL}>Proactive Disclosure – Grants and Contributions</a> dataset and is
          used under the{" "}
          <a href="https://open.canada.ca/en/open-government-licence-canada">Open Government Licence – Canada</a>.
          The search page shows when the current copy was retrieved. The government updates the
          dataset quarterly, and Atlas refreshes after each release.
        </p>
      </section>

      <section>
        <h2>Each agreement is counted once</h2>
        <p>
          When an agreement is amended, departments publish a new row that restates the
          agreement's full value. Adding up every row would count amended agreements several
          times, which overstates the total by about 15%. Atlas counts only the latest amendment
          of each agreement and keeps earlier amendments as history.
        </p>
        <p>
          Values are <strong>agreement values</strong>: the amount committed, not necessarily the
          amount paid out.
        </p>
      </section>

      <section>
        <h2>How recipients are grouped</h2>
        <ul>
          <li>
            <strong>Organizations</strong> are grouped by their business number when it is valid and
            used by only a few name variants. Otherwise they are grouped by a cleaned name, with
            legal suffixes such as Inc., Ltd. and Corp. removed.
          </li>
          <li>
            <strong>Individuals</strong> are grouped by name and province, never by business
            number: researchers and students are published under their institution's number.
          </li>
          <li>
            <strong>Placeholders</strong> such as “Batch report” (small grants published together)
            and “Withheld” (redacted names) are shown as groups of many recipients, not as one.
          </li>
        </ul>
        <p>
          Grouping is automatic, so one organization can still appear under more than one
          profile, for example a government listed by ministry.
        </p>
      </section>

      <section>
        <h2>Known limits</h2>
        <ul>
          <li>Locations are the recipient's address, not necessarily where the project happens.</li>
          <li>Some records have no start date, end date or recognized province; they appear in totals but not in yearly charts or on the map.</li>
          <li>Departments describe agreements in their own words, so search results depend on how each one was written.</li>
          <li>Small grants published as “Batch report” cannot be traced to individual recipients.</li>
        </ul>
      </section>

      <section>
        <h2>AI summaries</h2>
        <p>
          Recipient summaries are generated by an AI model with web search, only when someone asks
          for one, and then saved for everyone. They are labelled as AI-generated, list their
          sources, and may be incomplete or wrong. Funding figures always come from the
          government data, never from the AI.
        </p>
        <p>
          For individuals, a web summary is shown only when Atlas itself confirms that a cited page
          names the person together with their location or institution. Otherwise only an
          estimated category, such as student or researcher, is shown with a confidence level.
          Summaries never include personal details or name other people.
        </p>
      </section>
    </ContentPage>
  );
}

export function AboutPage() {
  return (
    <ContentPage
      eyebrow="About"
      title="About Maple Atlas"
      lead="Maple Atlas is an independent, open project that makes Canadian federal grant data easier to search, understand and share."
    >
      <section>
        <h2>Who built it</h2>
        <p>
          Maple Atlas is designed and built by <strong>Zion Koudijs</strong>, a software engineering
          student at Ontario Tech University. It is part of MapleScope, a set of tools for exploring
          Canadian public funding data.
        </p>
        <ul className="link-list">
          <li><a href="https://zionkoudijs.com">zionkoudijs.com</a></li>
          <li><a href="https://github.com/CodebyZK">GitHub</a></li>
          <li><a href="https://linkedin.com/in/zionkoudijs">LinkedIn</a></li>
        </ul>
      </section>

      <section>
        <h2>The MapleScope tools</h2>
        <dl className="tool-list">
          <div><dt>Maple Forge</dt><dd>Downloads, cleans and validates the government dataset.</dd></div>
          <div><dt>Maple Data API</dt><dd>Searches the full dataset and calculates totals.</dd></div>
          <div><dt>Maple Atlas</dt><dd>This website: search, maps and recipient profiles.</dd></div>
          <div><dt>Maple Beacon</dt><dd>Cached, sourced AI context about recipients.</dd></div>
        </dl>
      </section>

      <section>
        <h2>Independence</h2>
        <p>
          Maple Atlas is not affiliated with or endorsed by the Government of Canada. It republishes
          open government data under the Open Government Licence – Canada and adds its own
          processing, described in <Link to="/methods">Data &amp; methods</Link>.
        </p>
      </section>

      <section>
        <h2>Found a problem?</h2>
        <p>
          If a total looks wrong, a recipient is grouped incorrectly or an AI summary is
          inaccurate, please get in touch through{" "}
          <a href="https://zionkoudijs.com">zionkoudijs.com</a>. Corrections to the underlying
          records need to go to the department that published them.
        </p>
      </section>
    </ContentPage>
  );
}

export function NotFoundPage() {
  return (
    <ContentPage
      eyebrow="Page not found"
      title="That page does not exist"
      lead="The link may be out of date, or the address may have a typo."
    >
      <section className="callout">
        <Link className="primary-link" to="/">Go to search</Link>
      </section>
    </ContentPage>
  );
}
