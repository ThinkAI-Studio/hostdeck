# Open Source Growth & Contributor Strategy

> **Goal:** Pivot marketing efforts from acquiring "users" to acquiring "contributors" and achieving organic visibility via GitHub Trending. 

Marketing an open-source project focuses on architectural choices, technical philosophy, and community goodwill rather than traditional feature-based marketing. The code is the product.

## 1. Optimize the "Storefront" (Repo Readiness)

Before driving external traffic, the repository must be frictionless for potential contributors to clone and run.
- **Good First Issues:** Maintain 3-5 low-complexity, well-documented issues tagged `good first issue` or `help wanted` (e.g., adding a new system metric, creating a UI widget).
- **Frictionless Local Dev:** `CONTRIBUTING.md` must clearly state how to spin up the hot-reloading dev environment in under 1 minute (e.g., `make run` or via `compose.dev.yml`).
- **Community Hub:** Utilize GitHub Discussions. Developers often prefer asking questions or sharing setups in Discussions rather than opening formal Issues.

## 2. Targeting Contributor Platforms

Focus outreach on platforms heavily populated by software engineers, particularly Go and Vanilla JS developers.
- **Hacker News (Show HN):** 
  - *Angle:* "Show HN: I built a zero-dependency, Tailscale-only homelab console in Go."
  - *Why:* HN's audience appreciates minimalism, SQLite, and Go. Success here guarantees a massive spike in repository stars and forks.
- **`r/golang` (Reddit):**
  - *Angle:* "Show r/golang: An open-source homelab dashboard using `go:embed` and SQLite. Seeking feedback on the architecture."
  - *Why:* Direct outreach to Go developers who can read the source code and contribute.
- **Lobste.rs:**
  - *Angle:* Deep dive into architectural choices (e.g., WSS over reverse proxies).
- **Developer Blogs (Dev.to / Hashnode):**
  - *Angle:* "How we replaced 6 monitoring containers with one static Go binary." (Evergreen SEO content).

## 3. The "GitHub Trending" Launch Velocity

The GitHub Trending algorithm is driven by *star velocity* (the rate of new stars over 24-48 hours), not the total star count. 
To trigger the algorithm, promotional efforts must be coordinated:
- **Day 1 (Morning):** Post on Hacker News "Show HN".
- **Day 1 (Afternoon):** Post on `r/selfhosted` and `r/homelab`.
- **Day 2:** Post on `r/golang` and publish technical blog posts.
*Stacking these efforts creates the necessary velocity to hit the Trending page, providing global, organic exposure.*

## 4. Contributor Retention

Acquiring a Pull Request is only the first step.
- **Ultra-Fast Code Reviews:** Review and merge the first few external PRs within 12 hours. Responsiveness builds immense goodwill and converts one-time committers into core maintainers.
- **Public Recognition:** Use an "All Contributors" badge or section in the `README.md` to publicly thank code contributors.
