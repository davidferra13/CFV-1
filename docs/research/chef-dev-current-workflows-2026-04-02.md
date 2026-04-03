# ChefFlow Research: Current Chef and Developer Workflows

Date: `2026-04-02`

Note: for the broader synthesis that adds entrepreneur, business-owner, and company/corporate portal patterns, plus direct implications for the current demo and public-funnel work, see [Cross-Persona Workflow Patterns and Breakpoints](./cross-persona-workflow-patterns-and-breakpoints-2026-04-02.md).

## Why This Research Exists

This research was done to improve the existing ChefFlow documentation and builder handoff with real-world evidence, not assumptions.

Two questions were tested:

1. How do chefs and operators currently handle the workflow problems ChefFlow is trying to solve?
2. How do developers currently handle the discoverability and documentation problems we are solving inside the ChefFlow codebase?

This document is intentionally practical. It focuses on actual working patterns, failure points, and the implications for our current specs.

## Method

Multiple angles were used:

- current vendor workflow documentation
- current product/support documentation
- practitioner discussions from chef and small-business communities
- direct comparison against the current ChefFlow registry, route map, API map, and schema map

## Research Scope

Chef side:

- private chef and catering clientflow
- quote, contract, deposit, and invoice handling
- recipe costing, inventory, procurement, and food-cost control

Developer side:

- system discoverability in large active codebases
- ownership and review routing
- decision logging
- graph-based codebase exploration
- generated API documentation

## Chef Research

### What chefs and operators do today

There are two dominant stacks in the market.

#### 1. Service-business clientflow stack

Private chefs, caterers, and other service operators commonly use service-business tools to handle the commercial side of the job:

- `HoneyBook` for invoices, deposits, payment schedules, reminders, and contract-to-payment flow
- `Dubsado` for inquiry capture, contracts, invoices, schedulers, payment plans, and workflow automation
- `Square` for leads, estimates, contracts, scheduling, invoicing, payments, customer profiles, reminders, and client-facing booking flows

Evidence:

- HoneyBook explicitly positions invoice scheduling, reminders, installments, and contract-to-payment linkage as a single flow: [HoneyBook invoices](https://www.honeybook.com/create-invoice), [HoneyBook payment reminders](https://www.honeybook.com/product/payment-reminders)
- Dubsado’s getting-started flow centers on capturing lead information, sending contracts, creating invoices, and using templates and automation: [Dubsado getting started](https://help.dubsado.com/en/articles/8076495-get-started-with-dubsado), [Dubsado mobile workflows](https://updates.dubsado.com/55145-welcome-to-the-dubsado-mobile-app-finally)
- Square positions catering and appointment workflows as lead -> proposal/estimate -> contract -> payment -> reminders -> customer profile -> reporting: [Square for Catering](https://squareup.com/ca/en/solutions/caterers), [Square Appointments](https://squareup.com/ie/en/appointments), [Square Contracts](https://api.squareup.com/help/au/en/article/8133-create-and-send-square-contracts)

#### 2. Restaurant back-of-house economics stack

For costing, procurement, inventory, and menu profitability, operators either:

- stay on spreadsheets and manual invoice coding
- or adopt integrated restaurant systems like `Toast xtraCHEF`, `Apicbase`, `MarketMan`, or similar tools

Evidence:

- Toast xtraCHEF ties invoice item libraries to food cost, recipe, and inventory reporting: [Toast xtraCHEF item library](https://support.toasttab.com/en/article/xtraCHEF-Item-Review), [Toast xtraCHEF overview](https://pos.toasttab.com/products/xtrachef/)
- Apicbase positions recipes, inventory, procurement, production, and planning as one operational system: [Apicbase CRP](https://get.apicbase.com/culinary-resource-planning-software/), [Apicbase procurement](https://get.apicbase.com/procurement-management/)
- MarketMan positions recipe costing as dynamic and linked to purchasing, inventory, reporting, and supplier management: [MarketMan recipe costing](https://www.marketman.com/platform/recipe-costing-software)
- Supy explicitly describes the spreadsheet-to-integrated-platform transition and explains why operators outgrow static sheets: [Supy recipe costing guide](https://supy.io/blog/recipe-costing-software-guide)

### What practitioners still do manually

Practitioner evidence strongly suggests that spreadsheets remain common, especially for single-site operations and smaller teams.

Observed real workflows:

- recipe costing workbook with a master ingredient list updated regularly
- weekly or monthly inventory sheets by category
- invoices coded into GL / P&L categories manually
- high-value ingredient spot checks done daily
- private-chef pricing built from time estimate + shopping estimate + deposit + final invoice
- quote changes manually approved before work proceeds

Evidence:

- Restaurant owner workflow using a spreadsheet workbook for item costing linked to a master list and monthly GL/P&L coding: [r/restaurateur weekly inventory thread](https://www.reddit.com/r/restaurateur/comments/1me5ywc/weekly_inventory/)
- Private-chef pricing example including initial call, menu development, shopping, prep, travel, cleaning, invoice prep, deposits, and final invoice timing: [r/Chefit private chef pricing](https://www.reddit.com/r/Chefit/comments/1bsr7ap/private_chef_pricing/)
- Repeated practitioner insistence on contracts, approved quotes, and explicit change handling: [r/Chefit contract for personal chef work](https://www.reddit.com/r/Chefit/comments/1dtceum/contract_for_personal_chef_work/), [r/Chefit private chef quote dispute](https://www.reddit.com/r/Chefit/comments/1f50c36/private_chef_request_additional_money_beyond/)

### Where chef workflows break

Cross-checking the sources shows the same failure modes repeatedly.

#### Fragmented workflow stack

Operators often separate:

- clientflow tools for proposals, contracts, invoices, and payments
- kitchen tools for recipes, costing, procurement, and inventory
- accounting tools for GL, taxes, and reporting

This means the same event, menu, cost, and client data gets re-entered several times.

#### Spreadsheet drift

Spreadsheets work until ingredient pricing moves or the menu grows.

Verified failure points:

- stale ingredient prices
- manual recipe recalculation
- weak handling of yield loss
- poor multi-location support
- no direct comparison of theoretical vs actual usage

Evidence:

- Supy’s description of why spreadsheets fail under live supplier price changes, yield changes, and multi-site operations: [Supy guide](https://supy.io/blog/recipe-costing-software-guide)
- Toast and Apicbase both emphasize invoice- and supplier-driven data as the base for accurate costing: [Toast xtraCHEF item library](https://support.toasttab.com/en/article/xtraCHEF-Item-Review), [Apicbase procurement](https://get.apicbase.com/procurement-management/)

#### POS and accounting mismatch

Real operators still struggle to align:

- sales data from POS
- weekly ingredient usage
- purchase data coded into GL categories
- waste and variance

That gap is visible in the restaurateur thread where the operator can see category purchases and high-level food sales, but not ingredient-level usage by item in the POS workflow: [r/restaurateur weekly inventory thread](https://www.reddit.com/r/restaurateur/comments/1me5ywc/weekly_inventory/)

#### Private-chef trust and scope failures

Private-chef work breaks when the business workflow is not explicit:

- weak or missing contracts
- no clear revision approval process
- unclear deposit and payment schedule
- poor accounting for off-site labor, travel, shopping, cleanup, and equipment
- expectations not locked before the event

Evidence:

- Contract and boundary warnings from personal-chef practitioners: [r/Chefit contract thread](https://www.reddit.com/r/Chefit/comments/1dtceum/contract_for_personal_chef_work/)
- Approval-before-change expectation in private-chef disputes: [r/Chefit quote dispute](https://www.reddit.com/r/Chefit/comments/1f50c36/private_chef_request_additional_money_beyond/)

### What is missing in the current market

The gap is not “more features.” The gap is joining two systems that are still mostly separate:

1. service-business clientflow
2. live kitchen economics

Most tools are strong at one of these, not both.

That makes the ChefFlow direction defensible:

- inquiry to contract to deposit to payment
- menu to recipe to ingredient to live price
- vendor / procurement / inventory / variance
- event execution and closeout
- client retention and repeat service

### Chef implications for ChefFlow

Research-based implications:

1. Chefs think in workflow order before they think in product modules.
2. Quote, contract, deposit, revision approval, and final invoice must remain explicit.
3. Pricing must be live and evidence-backed, not just theoretical.
4. Inventory and procurement need category-level and ingredient-level views.
5. Theoretical vs actual variance is where the real operational pain sits.
6. Hidden labor matters: menu development, shopping, travel, setup, cleanup, and revision handling must stay first-class.

## Developer Research

### What developers do today

For large, active systems, developers generally combine several separate practices instead of using one unified system map.

#### 1. Software catalogs for discoverability

Backstage’s software catalog is the clearest mainstream pattern:

- centralized ownership and metadata
- entities stored as metadata files with the code
- browseable catalog for services, websites, libraries, pipelines, and more

Evidence:

- Backstage describes the catalog as a centralized system for ownership and metadata and explicitly frames it as a way to prevent orphan software: [Backstage Software Catalog](https://backstage.io/docs/features/software-catalog/)

#### 2. Docs-as-code for proximity to the code

Backstage TechDocs represents the mainstream “keep docs with code” pattern:

- engineers write Markdown that lives with the code
- docs are rendered and discovered through a unified platform

Evidence:

- TechDocs overview: [Backstage TechDocs](https://backstage.io/docs/features/techdocs/)

#### 3. CODEOWNERS for review routing

GitHub’s CODEOWNERS workflow is the standard ownership routing mechanism:

- assign owners by path pattern
- auto-request reviews
- require owner approval
- surface ownership before PR creation

Evidence:

- GitHub CODEOWNERS docs: [About code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)

#### 4. ADRs for architecture memory

Teams use architecture decision records to preserve important decisions over time, especially in brownfield systems.

Evidence:

- Microsoft’s guidance is explicit that ADRs should start at workload onset, be maintained through the workload lifespan, and be retroactively generated for brownfield workloads: [Microsoft ADR guidance](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architecture-decision-record)

#### 5. Graph tools for codebase exploration

Where teams use monorepo tooling, graph-based exploration is a common way to understand relationships between projects and tasks.

Evidence:

- Nx project graph guidance emphasizes interactive workspace exploration, graph export, and automatic freshness because the graph is derived from code analysis: [Nx Explore your Workspace](https://nx.dev/docs/features/explore-graph)

#### 6. OpenAPI / generated docs for machine-readable APIs

For APIs, OpenAPI plus generated docs/client SDKs remains the dominant approach.

Evidence:

- Swagger Codegen documentation emphasizes generating stubs, SDKs, and documentation from API definitions: [Swagger Codegen](https://swagger.io/tools/swagger-codegen/)

### Where developer workflows break

The current dev toolchain is strong, but still fragmented.

#### Ownership is not the same as discoverability

CODEOWNERS answers “who reviews this path?” It does not answer:

- what business feature this code belongs to
- whether the surface is visible, gated, or internal
- whether it is complete, partial, or abandoned

#### Graphs explain dependencies, not product meaning

Nx-style graphs are strong for:

- project relationships
- task execution order
- impact analysis

They do not directly answer:

- which hidden job implies a product capability
- which table backs a feature family
- what an operator or admin can actually see

#### API docs only cover the documented API surface

OpenAPI and Swagger help once the API has already been formalized.
They do not automatically capture:

- scripts
- cron jobs
- internal-only services
- table-implied capabilities
- UI-only systems

#### Docs drift unless they are validated

Backstage and TechDocs solve location and presentation, but not truthfulness by themselves.
If metadata is stale, the platform can still look organized while being wrong.

#### Brownfield systems need retroactive archaeology

Microsoft’s ADR guidance explicitly acknowledges brownfield retroactive documentation. That matters here because ChefFlow is not a fresh system; it is layered, mixed-state, and partially hidden.

### Developer implications for ChefFlow

Research-based implications:

1. The registry must stay co-located with the repo and be machine-readable.
2. Coverage generation should be rerunnable, not manual.
3. Ownership, evidence, and freshness metadata should be added next.
4. Discoverability must expose both technical and product meaning.
5. Hidden systems must remain first-class in the inventory.
6. ADR-style decision records should be added for future structural changes so the next archaeology pass does not start from zero.

## Direct Improvements Applied To Current Documentation

This research directly changes how the current documentation should be interpreted.

### Improvement 1: Browse Everything should not be domain-only

Chef users operate in lifecycle order. The builder should support:

- domain view
- workflow view

Suggested workflow order:

- inquiry
- quote
- contract / deposit
- menu / recipe
- pricing / vendor / inventory
- prep / production / service
- invoice / payment / closeout
- follow-up / reviews / loyalty / repeat service

### Improvement 2: Mission Control should include trust metadata

For internal users and future builders, each feature should eventually expose:

- owner
- evidence type
- last verified date
- route/API/schema coverage state
- confidence or maturity notes

### Improvement 3: Registry governance needs automation first

The highest-value next improvement is not more static docs. It is validation:

- rerun the audit
- catch drift in CI
- fail fast when new surfaces are not mapped

### Improvement 4: ChefFlow’s differentiator should stay explicit

Research shows the market usually splits clientflow from live kitchen economics.
ChefFlow’s documentation should keep emphasizing that it joins:

- service-business workflow
- live pricing and kitchen operations

That is more strategically important than treating every feature as equivalent.

## Bottom Line

The external research supports the current ChefFlow direction.

It also sharpens it:

- chef users need workflow-first discoverability, explicit commercial controls, and live cost intelligence
- developers need metadata-with-code, ownership, append-only decisions, generated coverage, and drift checks

Those two findings reinforce the same documentation principle:

ChefFlow should be documented and built as a system of connected workflows with evidence-backed metadata, not just a list of screens.

## Sources

Chef / operator workflow sources:

- Toast xtraCHEF overview: https://pos.toasttab.com/products/xtrachef/
- Toast xtraCHEF item library: https://support.toasttab.com/en/article/xtraCHEF-Item-Review
- Apicbase CRP: https://get.apicbase.com/culinary-resource-planning-software/
- Apicbase procurement: https://get.apicbase.com/procurement-management/
- MarketMan recipe costing: https://www.marketman.com/platform/recipe-costing-software
- Supy recipe costing guide: https://supy.io/blog/recipe-costing-software-guide
- Square for Catering: https://squareup.com/ca/en/solutions/caterers
- Square Appointments: https://squareup.com/ie/en/appointments
- Square Contracts: https://api.squareup.com/help/au/en/article/8133-create-and-send-square-contracts
- HoneyBook invoices: https://www.honeybook.com/create-invoice
- HoneyBook payment reminders: https://www.honeybook.com/product/payment-reminders
- Dubsado getting started: https://help.dubsado.com/en/articles/8076495-get-started-with-dubsado
- Dubsado mobile workflows: https://updates.dubsado.com/55145-welcome-to-the-dubsado-mobile-app-finally
- Practitioner thread on weekly inventory and spreadsheet costing: https://www.reddit.com/r/restaurateur/comments/1me5ywc/weekly_inventory/
- Practitioner thread on private chef contracts: https://www.reddit.com/r/Chefit/comments/1dtceum/contract_for_personal_chef_work/
- Practitioner thread on private chef pricing structure: https://www.reddit.com/r/Chefit/comments/1bsr7ap/private_chef_pricing/
- Practitioner thread on quote / contract clarity: https://www.reddit.com/r/Chefit/comments/1f50c36/private_chef_request_additional_money_beyond/

Developer workflow sources:

- Backstage Software Catalog: https://backstage.io/docs/features/software-catalog/
- Backstage TechDocs: https://backstage.io/docs/features/techdocs/
- GitHub CODEOWNERS: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- Microsoft ADR guidance: https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architecture-decision-record
- Nx Explore your Workspace: https://nx.dev/docs/features/explore-graph
- Swagger Codegen: https://swagger.io/tools/swagger-codegen/
