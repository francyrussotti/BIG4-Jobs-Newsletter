// ---------- Business case & interview: requirements, methods, sector module (EU space), questions, exercises ----------
// Content written for this programme from public sources (European Commission, EUSPA, ESA, European Court of Auditors).
// Personal notes stay in the browser (DB.iv), never in the published code. Page language: English (the interview is in English).
const IVV={tab:'req',ex:null,quiz:null};
const ivDB=()=>{ DB.iv=DB.iv||{notes:{},ex:{n:0,ok:0},quiz:{n:0,ok:0}}; DB.iv.notes=DB.iv.notes||{}; DB.iv.ex=DB.iv.ex||{n:0,ok:0}; DB.iv.quiz=DB.iv.quiz||{n:0,ok:0}; return DB.iv; };
const IV_TABS=[['req','Role requirements'],['space','EU space'],['meth','Methods'],['proj','Project examples'],['tq','Technical questions'],['bq','Personal questions'],['ex','Exercises'],['quiz','Quiz']];

// ---- 1. Vacancy requirements ----
const IV_REQ=[
 {k:'msc',r:'MSc in Science, Engineering, Business, Economics',they:'A formal filter. What counts in the interview is how you link it to the job: quantitative methods, research, policy.',prove:'One sentence linking your degree (thesis, courses, projects) to market analysis, economics or public policy.',q:'Walk me through your background. Why does it fit this role?'},
 {k:'innov',r:'Strong interest in innovation, science and new technologies',they:'Evidence that you actually follow the sector, not just a claim.',prove:'Mention two or three recent developments and give an opinion: the first Celeste satellites (March 2026), the acceleration of IRIS², the proposed EU Space Act, EUSPA\'s new EU Space Market Report (2026).',q:'Which recent development in European space caught your attention, and why does it matter?'},
 {k:'comm',r:'Excellent communication in English (oral and written)',they:'They assess it throughout the whole interview.',prove:'Answer first, reasons after (pyramid structure). Short sentences. Numbers with units and orders of magnitude.',q:'Explain a technical topic you know to someone with no background.'},
 {k:'quant',r:'Demonstrable quantitative skills for market and cost-benefit assessments',they:'The core technical requirement: it is the team\'s daily work.',prove:'Being able to set up a cost-benefit analysis and a market estimate out loud, with formulas and explicit assumptions. One example of your own quantitative work (Excel, Python, statistics) and its result.',q:'How would you structure a cost-benefit analysis of an EU space initiative? / Estimate the market for X.'},
 {k:'wp',r:'Demonstrable experience managing research tasks / work packages',they:'That you can deliver a piece of research on your own: objective, sources, plan, deadline, quality check, delivery.',prove:'A concrete STAR example with numbers: how many sources, how many interviewees, how many weeks, what you delivered, how it was used.',q:'Tell me about a research task you managed from start to finish.'},
 {k:'office',r:'Proficiency in Excel, Word and PowerPoint',they:'That you are productive from day one.',prove:'Be specific: XLOOKUP/INDEX-MATCH, pivot tables, NPV/IRR functions, data tables for sensitivity analysis, error checks. PowerPoint: action titles that state the conclusion, one message per slide.',q:'How would you build a sensitivity analysis in Excel?'},
 {k:'flex',r:'Self-motivation and flexibility in a small, fast-growing consultancy',they:'That you don\'t need hand-holding and can cope with shifting priorities and tight deadlines.',prove:'An example of priorities changing at the last minute and how you reorganised without losing quality.',q:'Tell me about a time priorities changed suddenly.'},
 {k:'ai',r:'Strong affinity with AI, interest in applying AI at work',they:'Concrete, critical use, not generic enthusiasm. Consultancies sell AI adoption to clients.',prove:'Two or three real uses (desk research, extracting data from PDFs, code for analysis, first drafts) and how you check the output: source verification, no confidential data in public tools, traceability.',q:'How do you use AI in your work? How would you use it to produce a market report?'},
 {k:'team',r:'Work independently and in a team',they:'Balance: autonomy on your piece, coordination on the rest.',prove:'One example where you asked for help at the right moment, and one where you unblocked someone else\'s work.',q:'Describe a disagreement in a team and how you handled it.'},
 {k:'bonus',r:'Bonus: secure satcom, Earth Observation and geospatial, GNSS, EU space ecosystem',they:'Not mandatory, but they set you apart from other juniors with the same profile.',prove:'Know the basics in the "EU space" and "Project examples" tabs and connect them to markets (agriculture, transport, insurance, security).',q:'What do you know about Galileo / Copernicus / IRIS²?'}
];

// ---- 2. EU space ecosystem ----
const IV_SPACE=[
 {h:'Who does what',b:`<dl class="dl">
  <dt>European Commission · DG DEFIS</dt><dd>Directorate-General for Defence Industry and Space. Owner of the EU Space Programme: policy, budget, legislation. Reports to the Commissioner for Defence and Space.</dd>
  <dt>EUSPA (Prague)</dt><dd>EU Agency for the Space Programme. Runs the exploitation of Galileo and EGNOS, security accreditation, market development and user uptake (Galileo, EGNOS, Copernicus), and has roles in GOVSATCOM and IRIS². Publishes the <i>EU Space Market Report</i>. The team's main client.</dd>
  <dt>ESA</dt><dd>An <b>intergovernmental</b> organisation, not an EU body (some ESA members are not in the EU, e.g. the UK, Switzerland, Norway). For the EU it acts as technical and design authority on many components. Runs its own programmes (science, launchers, Celeste for LEO-PNT).</dd>
  <dt>Others</dt><dd>EU SatCen (geospatial intelligence, Copernicus security service). Copernicus entrusted entities: ECMWF for atmosphere and climate, Mercator Ocean for marine, EEA and JRC for land and emergencies. National agencies: CNES, DLR, ASI. European Court of Auditors (audit).</dd>
 </dl>`},
 {h:'EU Space Programme 2021-2027',b:`<p>Regulation (EU) 2021/696. Budget <b>€14.88 billion</b>: Galileo and EGNOS about €9bn, Copernicus about €5.4bn, SSA and GOVSATCOM about €0.44bn. Components: <b>Galileo, EGNOS, Copernicus, SSA</b> (space surveillance and tracking, space weather, near-Earth objects), <b>GOVSATCOM</b>. IRIS² has its own regulation, 2023/588.</p>
  <p class="small muted">Next budget 2028-2034: the Commission proposal (July 2025) puts space inside a <i>European Competitiveness Fund</i>, in a "Resilience, Security, Defence Industry and Space" window of about €131bn, with no ring-fenced amount for space. Still under negotiation: <b>check</b> the status before the interview.</p>`},
 {h:'Galileo and EGNOS (navigation, GNSS)',b:`<dl class="dl">
  <dt>Galileo</dt><dd>The EU global navigation satellite system, under civilian control. Satellites in medium Earth orbit (about 23,000 km).</dd>
  <dt>Services</dt><dd>Free <b>Open Service</b>. <b>HAS</b> (High Accuracy Service): free corrections, around 20 cm accuracy, initial service since January 2023. <b>OSNMA</b>: authenticates the navigation message against spoofing, initial service declared by EUSPA on 24 July 2025. <b>PRS</b>: encrypted service for authorised government users. <b>SAR</b>: search and rescue with a return link.</dd>
  <dt>Why, if GPS is free</dt><dd>Strategic autonomy (GPS is a US military system), resilience, more satellites in view and so better accuracy in cities, distinctive services (HAS, OSNMA, SAR return link), PRS.</dd>
  <dt>EGNOS</dt><dd>Satellite-based augmentation system (SBAS) over Europe that improves GPS accuracy and integrity: precision approaches in aviation (LPV), agriculture, maritime.</dd>
  <dt>LEO-PNT</dt><dd>Positioning, navigation and timing from low Earth orbit (500-1,200 km). Stronger signals and fast-changing geometry: more resilience to jamming and spoofing, faster convergence of precise positioning. ESA's <b>Celeste</b> demonstrator launched its first 2 satellites at the end of March 2026 (Electron rocket); 8 more planned from 2027. A typical consulting assignment: a cost-benefit analysis of an EU LEO-PNT initiative.</dd>
 </dl>`},
 {h:'Copernicus (Earth Observation)',b:`<dl class="dl">
  <dt>What it is</dt><dd>The EU Earth Observation programme. Data are <b>free, full and open</b>. Access through the Copernicus Data Space Ecosystem.</dd>
  <dt>Sentinels</dt><dd><b>1</b> synthetic aperture radar (SAR, C-band): sees at night and through clouds. <b>2</b> high-resolution multispectral optical (10 m): agriculture, land. <b>3</b> ocean and land: colour, temperature, altimetry. <b>5P</b> atmosphere. <b>6</b> sea level. Expansion missions in development (e.g. CO2M for CO₂, CHIME, CIMR, CRISTAL, LSTM, ROSE-L).</dd>
  <dt>6 services</dt><dd>Land, marine, atmosphere, climate change, emergency management, security.</dd>
  <dt>Contributing missions</dt><dd>Commercial data, often very high resolution, purchased to complement the Sentinels. A typical cost-benefit question is the value of high-resolution, fast-revisit data compared with the Sentinels (10 m, a few days between passes).</dd>
 </dl>`},
 {h:'Secure satellite communications',b:`<dl class="dl">
  <dt>GOVSATCOM</dt><dd>Pooling and sharing of secure satellite capacity, national and commercial, for governmental users (security, crisis management, maritime surveillance).</dd>
  <dt>IRIS²</dt><dd>Multi-orbit (LEO and MEO) constellation for secure connectivity. 12-year concession contract signed on 16 December 2024 with the <b>SpaceRISE</b> consortium (SES, Eutelsat, Hispasat). Initial plan: about 290 satellites, €10.6bn (about €6.5bn public), governmental services from 2030. In 2026 a reinforcement and acceleration to 2029 was announced; press figures vary, so <b>check</b> before the interview.</dd>
  <dt>Why</dt><dd>Sovereignty and dependence on non-EU constellations (Starlink), lessons from the war in Ukraine, resilience of government communications.</dd>
 </dl>`},
 {h:'Policies and documents to know',b:`<dl class="dl">
  <dt>EU Space Act</dt><dd>Proposed regulation COM(2025) 335 of 25 June 2025. Three pillars: <b>safety</b> (debris, collision avoidance), <b>resilience</b> (cybersecurity; lex specialis to NIS2), <b>sustainability</b> (common method for environmental footprint). Expected to apply from 2030. Under discussion in the European Parliament (ITRE committee) and the Council: <b>check</b> progress.</dd>
  <dt>European Court of Auditors, Special Report 07/2021</dt><dd>On Galileo and Copernicus: services launched, but uptake below potential. Copernicus used mainly by experts, weak monitoring of Galileo uptake, no <b>comprehensive strategy with measurable, time-bound objectives</b>. Recommendations: a strategy, a framework to measure socio-economic benefits, integrated data access. In 2024 the Commission published a staff working document with a framework for measuring uptake. Supporting the implementation of these recommendations is a typical consulting assignment.</dd>
  <dt>Other</dt><dd>EU Space Strategy for Security and Defence (March 2023). Chips Act (2023), relevant to the semiconductor project.</dd>
 </dl>`},
 {h:'Market: definitions and figures',b:`<dl class="dl">
  <dt>Upstream</dt><dd>Building and launching the infrastructure: satellites, launchers, ground segment.</dd>
  <dt>Downstream</dt><dd>Products and services using space signals and data: receivers, applications, value-added services. The team's focus.</dd>
  <dt>In-space economy</dt><dd>Activities in orbit: satellite servicing and refuelling, logistics, in-orbit manufacturing, debris removal.</dd>
  <dt>New Space</dt><dd>Private, venture-funded players, small satellites in constellations, lower launch costs, "data as a service" models. For the EU it raises the question of buying commercial services instead of building its own infrastructure.</dd>
  <dt>EU Space Market Report 2026</dt><dd>EUSPA, May 2026: brings together GNSS, Earth Observation, secure satcom and SSA, 16 market segments (new: border and internal security). <b>GNSS</b>: revenues from about €300bn (2024) to €580bn (2034), almost 10bn devices installed, services towards 80% of revenues. <b>Earth Observation</b>: from €3.5bn to €7.9bn; agriculture is the largest segment (about 21%); European suppliers hold 42% of revenues. <b>Secure satcom</b>: EU demand from about €0.2bn (2025) to about €1.2bn (2040). Read at least the executive summary on the EUSPA website.</dd>
 </dl>`}
];

// ---- 3. Methods ----
const IV_METH=[
 {h:'Cost-benefit analysis (CBA)',b:`<p><b>Purpose:</b> to measure whether an intervention increases society's welfare, not whether it is profitable for whoever delivers it.</p>
  <p><b>Steps</b> (Commission Guide to Cost-Benefit Analysis of Investment Projects, 2014):</p>
  <ol>
   <li>Context and objectives.</li>
   <li>The <b>without-project</b> scenario (counterfactual or baseline). Everything is measured as the difference "with minus without".</li>
   <li>Alternative options.</li>
   <li><b>Financial analysis</b>: the operator's cash flows, FNPV.</li>
   <li><b>Economic analysis</b>: shadow prices, externalities, taxes and subsidies excluded because they are transfers. Outputs: ENPV, ERR, B/C.</li>
   <li><b>Risk</b>: sensitivity analysis, switching values, scenarios, Monte Carlo.</li>
  </ol>
  <dl class="dl">
   <dt>Formulas</dt><dd>NPV = Σ (Bₜ − Cₜ) / (1+r)ᵗ. B/C = present value of benefits / present value of costs. IRR = the rate that makes NPV = 0. Constant annuity over n years: factor = (1 − (1+r)⁻ⁿ) / r.</dd>
   <dt>Decision rule</dt><dd>ENPV &gt; 0, ERR &gt; social discount rate, B/C &gt; 1.</dd>
   <dt>Discount rate</dt><dd>2014 Guide: 3% real social rate, 5% in cohesion countries; 4% real financial rate. The Better Regulation Toolbox recommends 3%. Constant prices with a real rate, or current prices with a nominal rate: never mix them.</dd>
   <dt>Sensitivity</dt><dd>A variable is <b>critical</b> if a 1% change moves NPV by more than 1%. The <b>switching value</b> is the change that brings NPV to zero, e.g. how much benefits must fall: NPV / PV of benefits.</dd>
   <dt>Classic mistakes</dt><dd>Double counting the same benefit (e.g. time saved and productivity gain from the same effect). Attributing benefits that would happen anyway. Including sunk costs. Forgetting operating and replacement costs.</dd>
  </dl>`},
 {h:'Valuing hard-to-measure benefits',b:`<dl class="dl">
  <dt>Categories</dt><dd>Direct effects: industry revenues and jobs. Indirect: supply chain. Induced: spending of the income generated. User benefits: time and fuel saved, crop yields, avoided damage, lives saved (value of a statistical life). Strategic benefits: autonomy, security.</dd>
  <dt>Methods</dt><dd>Avoided costs. Productivity effect. Willingness to pay: revealed by behaviour or stated in surveys (contingent valuation). Benefit transfer from existing studies. Value of information, for Earth Observation data.</dd>
  <dt>Attribution</dt><dd>The tricky point in space. Receivers use several constellations, so Galileo's benefit is <b>marginal with respect to GPS</b>: better accuracy in cities, authentication, resilience if GPS is unavailable. Typical formula: total benefit × share of Galileo-enabled users × share of the benefit that depends on Galileo.</dd>
  <dt>If it cannot be monetised</dt><dd>Multi-criteria or cost-effectiveness analysis, or replacement cost and outage scenarios: what a GNSS outage would cost the economy.</dd>
 </dl>`},
 {h:'Evaluations and impact assessments (Better Regulation)',b:`<dl class="dl">
  <dt>Evaluation (ex post)</dt><dd>Five criteria: <b>effectiveness, efficiency, relevance, coherence, EU added value</b>. Start from the intervention logic (needs → objectives → inputs → activities → outputs → results → impacts) and write evaluation questions for each criterion.</dd>
  <dt>Impact assessment (ex ante)</dt><dd>The problem and its drivers; why the EU should act (subsidiarity); SMART objectives; options, including the baseline; economic, social and environmental impacts, on SMEs and competitiveness; comparison of options; monitoring. Reviewed by the Regulatory Scrutiny Board, with a public consultation.</dd>
  <dt>Tools</dt><dd>Desk research, surveys, semi-structured interviews, case studies, workshops. Triangulation across sources. Contribution analysis and counterfactual analysis to separate the effect of the intervention from everything else.</dd>
  <dt>Gap analysis</dt><dd>Current state versus desired state: user needs versus supply, barriers, and actions to close the gap. EUSPA collects user requirements by segment (User Requirements Reports, User Consultation Platform).</dd>
 </dl>`},
 {h:'Market analysis and forecasting',b:`<dl class="dl">
  <dt>TAM / SAM / SOM</dt><dd>Total market, market reachable with your offer, share you can realistically win.</dd>
  <dt>Top-down and bottom-up</dt><dd><b>Top-down</b>: total market × shares. <b>Bottom-up</b>: number of users × adoption rate × price. Do both and compare: if they diverge, one of the assumptions is wrong.</dd>
  <dt>Indicators</dt><dd>Installed base and annual device shipments, average revenue per user, penetration. CAGR = (final / initial)^(1/n) − 1. Rule of 72: years to double ≈ 72 / growth %.</dd>
  <dt>Forecasting</dt><dd>S-shaped adoption curves (Bass model), scenarios (low, base, high), demand drivers (regulation, prices, technology). Assumptions must be stated.</dd>
  <dt>Value chain</dt><dd>For semiconductors: design, fabrication, assembly and test, integration. Identify players, dependencies and bottlenecks (e.g. radiation-hardened components, US export control). Demand = units × content per unit × price.</dd>
  <dt>Market and technology monitoring</dt><dd>Fixed indicators, recurring sources (company accounts, databases, patents, start-up investment, trade press), expert validation, periodic updates.</dd>
  <dt>Conflicting data</dt><dd>Check definitions and scope (device or service revenues? global or EU?), year and currency, method, who produced the figure and why. Reconcile, or show a range, and state your choice.</dd>
 </dl>`},
 {h:'Market uptake: barriers and levers',b:`<p><b>Barriers</b>: low awareness, integration costs, missing standards, skills, regulation, data that are hard to use.</p>
  <p><b>Levers</b>: embedding the service in rules and standards. Galileo is mandatory in eCall for new cars type-approved since 2018 and is used by the smart tachograph. Other levers: public procurement, funding (Horizon Europe), training, ready-to-use services.</p>
  <p><b>Smart mobility</b>: eCall, road user charging, connected and automated driving (lane-level accuracy needed: HAS, corrections), drones (U-space).</p>
  <p><b>Commodities trading</b>: Earth Observation to forecast harvests and monitor oil storage, ports and mines. GNSS timing to timestamp transactions: MiFID II requires clocks synchronised and traceable to UTC.</p>`}
];

// ---- 4. Project examples ----
const IV_PROJ=[
 {t:'CBA of the EU LEO-PNT initiative (for EUSPA and the Commission)',what:'Deciding whether and how the EU should have a low-orbit navigation component alongside Galileo.',you:'Data collection on costs (satellites, launches, ground segment, operations), benefit estimates by sector, Excel model, sensitivity analysis, interviews with industry and users.',m:'Counterfactual: Galileo alone, plus commercial or terrestrial alternatives. Benefits: avoided losses from GNSS jamming or spoofing (telecoms, finance, energy, transport), better performance, autonomy. Cost-effectiveness or multi-criteria analysis for the strategic part.',trap:'Do not attribute to LEO-PNT benefits already delivered by Galileo (OSNMA, HAS). Treat commercial alternatives as an option, don\'t ignore them.',q:'What would be the key benefit categories and the counterfactual in a CBA of LEO-PNT?'},
 {t:'Market and technology monitoring, EO & GNSS Market Report',what:'EUSPA\'s reference report on downstream markets, now the EU Space Market Report.',you:'Updating databases by segment, collecting company and shipment data, consistency checks, drafting segment sections, expert validation.',m:'Installed base × penetration × revenue per unit. Device and service revenues. 10-year forecasts with scenarios.',trap:'Definitions change between editions: a direct comparison across reports can be wrong.',q:'How would you forecast GNSS revenues in road and automotive to 2034?'},
 {t:'European Court of Auditors recommendations on a comprehensive space strategy',what:'Helping EUSPA respond to Special Report 07/2021: strategy, measurable objectives, uptake monitoring.',you:'Mapping the recommendations, analysing what already exists, proposing KPIs with baselines and targets.',m:'Intervention logic, SMART indicators, monitoring framework.',trap:'Indicators that are easy to measure but say nothing (number of events held) instead of result indicators (active users, share of Galileo-enabled receivers).',q:'Which KPIs would you propose to measure Copernicus uptake?'},
 {t:'Semiconductors in defence and space (DG DEFIS)',what:'Mapping the EU value chain and key players, and forecasting demand over ten years.',you:'Desk research on companies and production capacity, interviews, stakeholder database, demand model.',m:'Value chain by stage. Demand = number of platforms × components per platform × price, with scenarios. Dependency analysis.',trap:'Small but critical volumes: the issue is not market size but dependency (US export control, a single foundry).',q:'How would you forecast EU demand for space-grade semiconductors?'},
 {t:'Market uptake: smart mobility and commodities trading (EUSPA)',what:'Strategic and economic support to increase the use of EU space services in two segments.',you:'User and needs analysis, stakeholder mapping, use cases, barriers, action plan.',m:'See "Market uptake" in the Methods tab.',trap:'Proposing generic actions ("more communication") instead of concrete levers (standards, regulation, procurement).',q:'How would you increase Galileo HAS uptake in automated driving?'},
 {t:'CBA of Copernicus and high-resolution, fast-revisit data (private client)',what:'Assessing whether it pays to buy very-high-resolution commercial data on top of free Sentinel data.',you:'Use cases, technical comparison (resolution, revisit, cost per km²), estimate of the added value.',m:'Value of information: how much the decision improves (e.g. avoided losses, targeted interventions) with better data, minus the cost of the data.',trap:'More resolution is not always worth more: if the decision doesn\'t change, the added value is zero.',q:'When is it worth paying for very-high-resolution imagery instead of free Sentinel-2 data?'},
 {t:'EU space data ecosystem (EUSPA)',what:'Understanding how data flow: platforms, providers, users, business models.',you:'Mapping players and platforms, interviews, analysis of flows and access barriers.',m:'Ecosystem map, business model analysis, recommendations.',trap:'Confusing data availability with usability: open data are not enough if skills are needed to use them.',q:'What are the main barriers for SMEs to use Copernicus data?'},
 {t:'Boosting the use of Copernicus: evaluation, gap analysis, recommendations (DG DEFIS)',what:'Evaluation with the Better Regulation criteria and a plan to close the gaps.',you:'User surveys and interviews, analysis of access data, case studies, evaluation grid.',m:'Five evaluation criteria, intervention logic, gap analysis, triangulation.',trap:'Measuring downloads instead of actual use and value generated.',q:'How would you evaluate the effectiveness of Copernicus user uptake actions?'}
];

// ---- 5. Technical questions with model answers ----
const IV_TQ=[
 {q:'What is the difference between upstream and downstream space?',a:'Upstream is building and launching the infrastructure: satellites, launchers and ground segment. Downstream is everything that uses space signals and data: receivers, applications and value-added services. Downstream is much larger in revenue. GNSS downstream alone is around €300 billion a year according to EUSPA, and it is where most socio-economic benefits are generated.',n:'Mention the "in-space economy" if you want to show you know the trend.'},
 {q:'Why does Europe need Galileo when GPS is free?',a:'Three reasons. Strategic autonomy: GPS is a US military system and Europe cannot depend on it for critical infrastructure. Performance: more satellites mean better accuracy and availability, especially in cities. Distinctive services: free high-accuracy corrections (HAS), navigation message authentication against spoofing (OSNMA), the encrypted Public Regulated Service and search-and-rescue with a return link.',n:'If they ask about economic benefits: Galileo\'s value is marginal with respect to GPS. Say it before they do.'},
 {q:'How would you structure a CBA of an EU LEO-PNT component?',a:'First define the counterfactual: Galileo and GPS as they are, plus available commercial or terrestrial alternatives. Then the options, for example an EU-owned system versus buying a commercial service. On the cost side: development, deployment, launch, ground segment, operations and replenishment over the life cycle. On the benefit side: avoided losses from GNSS jamming or spoofing in critical sectors, performance gains, and strategic autonomy, which may need a multi-criteria approach. Discount at the social rate, test sensitivity on the most uncertain variables, especially outage probability and duration, and report switching values.',n:'Structure: counterfactual → options → costs → benefits → discounting → sensitivity.'},
 {q:'Financial vs economic analysis: what is the difference?',a:'The financial analysis looks at cash flows for the project owner and tells you if the project is financially sustainable. The economic analysis looks at society as a whole: it uses shadow prices, includes externalities and non-market benefits, and removes transfers such as taxes and subsidies. A space infrastructure typically has a negative financial NPV and, to be justified, a positive economic NPV.',n:''},
 {q:'Which discount rate would you use, and what if the result depends on it?',a:'For EU appraisal I would use the social discount rate in Commission guidance, 3% in real terms, consistent with constant prices. If the conclusion changes with the rate, that is a finding in itself: I would show NPV at alternative rates, compute the internal rate of return and explain that long-lived benefits are sensitive to discounting.',n:'5% in cohesion countries according to the 2014 Guide.'},
 {q:'How do you value benefits that are hard to monetise, such as security or autonomy?',a:'I would be explicit that they are not in the NPV and avoid inventing a number. Options are: an avoided-cost approach, such as the economic cost of a GNSS outage; cost-effectiveness, meaning the cheapest way to reach a given level of resilience; or a multi-criteria analysis alongside the CBA. Decision makers need to see the monetised and non-monetised parts separately.',n:''},
 {q:'Users have multi-constellation receivers. How do you attribute benefits to Galileo?',a:'By measuring the marginal contribution. Start from the total benefit in a segment, apply the share of devices that are Galileo-enabled, then the share of the benefit that depends on Galileo specifically: better availability in urban areas, authentication, or service continuity if another constellation fails. Then test that share in the sensitivity analysis, because it is usually the most uncertain parameter.',n:'There is a numerical exercise on this in the Exercises tab.'},
 {q:'How would you estimate the market for Copernicus-based services in EU agriculture?',a:'Bottom-up: number of farms above a size threshold, times expected adoption of satellite-based services, times average annual spend per farm. Cross-check top-down using the EO revenue figures in the EUSPA market report, where agriculture is the largest EO segment. If the two numbers diverge, revisit adoption and price assumptions. I would present a range with low, base and high scenarios.',n:''},
 {q:'What are the Better Regulation evaluation criteria? How would you evaluate Copernicus uptake actions?',a:'Effectiveness, efficiency, relevance, coherence and EU added value. I would reconstruct the intervention logic of the uptake actions, define evaluation questions for each criterion, and combine data on platform use, a user survey, interviews with intermediaries and a few case studies. Then I would triangulate the sources and compare results with a baseline where possible.',n:''},
 {q:'What is IRIS² and why is the EU building it?',a:'IRIS² is a multi-orbit secure connectivity constellation, in low and medium Earth orbit, delivered through a 12-year concession with the SpaceRISE consortium of SES, Eutelsat and Hispasat, signed in December 2024. It provides secure governmental communications and commercial services. The rationale is sovereignty, resilience and reducing dependence on non-EU providers such as Starlink, which the war in Ukraine made very visible.',n:'A reinforcement and acceleration to 2029 was announced in 2026: check the latest figures.'},
 {q:'What is the role of EUSPA compared with ESA and DG DEFIS?',a:'DG DEFIS in the Commission owns the EU Space Programme: policy, budget and legislation. EUSPA is the EU agency that operates Galileo and EGNOS, does security accreditation and drives market development and user uptake, including for Copernicus. ESA is an intergovernmental organisation, not an EU body, that acts as technical and design authority on many EU programme components and runs its own programmes.',n:''},
 {q:'Two sources give very different market sizes. What do you do?',a:'First I check definitions and scope: devices or services, global or EU, which year and currency, whether the figure is revenue or value added. Then the method and who produced it. Usually the gap comes from scope. If it remains, I build my own estimate bottom-up, present a range, and state clearly which assumption I chose and why.',n:''},
 {q:'How would you design a user survey on needs for a space service?',a:'Define the population and how to reach it through associations and EUSPA networks. Keep it short, with closed questions for the core indicators and a few open ones. Pilot it with a handful of users and avoid leading questions. Monitor response rates by segment, then follow up with interviews to understand the reasons behind the numbers, because surveys tell you what and interviews tell you why.',n:''},
 {q:'How would you use AI to prepare a market report without compromising quality?',a:'For speed on low-risk tasks: screening sources, extracting figures from long PDFs, first drafts and code for data cleaning. Every figure is traced back to a primary source and verified, because models can invent numbers. Confidential client data does not go into public tools, only into approved enterprise tools. The final judgement and the numbers we sign off stay with the team.',n:'Same logic as the AI proficiency part of the Maki test.'},
 {q:'What did the European Court of Auditors find on Galileo and Copernicus?',a:'In Special Report 07/2021 the Court found that services were launched but uptake was below potential: Copernicus mainly used by experts, weak monitoring of Galileo uptake, and no comprehensive strategy with measurable, time-bound objectives. It recommended a strategy, a framework to assess socio-economic benefits and better integrated access to data.',n:''},
 {q:'What is the EU Space Act?',a:'A Commission proposal from June 2025 for a regulation on space activities, built on three pillars: safety, meaning collision avoidance and debris; resilience, with cybersecurity rules acting as a lex specialis to NIS2; and environmental sustainability, with a common method to measure footprint. It would apply from 2030 and is still in the legislative process. For a consultancy it means work on impact and compliance-cost assessments.',n:''},
 {q:'When is very-high-resolution commercial imagery worth paying for compared with free Sentinel-2?',a:'Only when it changes a decision. Sentinel-2 at 10 metres is enough for crop monitoring at field level. Higher resolution or daily revisit adds value for small objects, urban change, infrastructure inspection, insurance claims or emergencies where timing matters. I would quantify it as a value of information: the better decisions made possible, minus the cost of the data.',n:''},
 {q:'How would you present a complex CBA to a non-technical audience?',a:'Start with the answer: the project creates net benefits of X under realistic assumptions. Then show the three biggest benefit drivers, what would make the result change sign, and what we could not monetise. One chart for benefits versus costs over time, one for sensitivity. Methodology in the annex.',n:''},
 {q:'How would you build a sensitivity analysis in Excel?',a:'Put all assumptions in one input sheet, with no hard-coded numbers in the calculations. Compute NPV with the NPV function or explicit discount factors. Use data tables to vary one or two key inputs, a tornado chart to rank variables by impact, and Goal Seek to find switching values. For uncertainty ranges, a simple Monte Carlo with random draws over the critical variables.',n:''}
];

// ---- 6. Personal questions (STAR) ----
const IV_BQ=[
 {k:'pitch',q:'Tell me about yourself (60-90 seconds).',t:'Who you are in one sentence, two experiences linked to the role (research, quantitative analysis), why EU space and why now.'},
 {k:'whyey',q:'Why this firm, and why this team?',t:'A small team with institutional clients (EUSPA, DG DEFIS, ESA), work on real data and policy, the projects in the job description. No sentences that would fit any company.'},
 {k:'whyspace',q:'Why space? Why EU policy?',t:'A concrete, personal reason linked to impact: space as infrastructure for agriculture, transport and security; the EU as the actor deciding how to use it.'},
 {k:'research',q:'Tell me about a research task you managed end to end.',t:'STAR: objective, sources, plan, deadlines, obstacles, result with numbers, how it was used.'},
 {k:'deadline',q:'Tell me about a time priorities changed or a deadline was very tight.',t:'How you reorganised, what you communicated and to whom, what you dropped and why.'},
 {k:'conflict',q:'Describe a disagreement in a team.',t:'The facts, your position, how you listened, the solution. No blaming others.'},
 {k:'defend',q:'Tell me about a time you had to defend your analysis.',t:'What you presented, the objection, how you answered with data, what you changed.'},
 {k:'mistake',q:'Tell me about a mistake you made.',t:'A real but not serious mistake, how you noticed it, what you fixed, what you do differently now.'},
 {k:'learn',q:'How do you get up to speed on a new topic quickly?',t:'Your method: official sources, sector reports, experts, a concept map. A concrete example.'},
 {k:'aiuse',q:'Give an example of how you used AI to do something better or faster.',t:'Task, tool, how you checked the output, how much time you saved.'},
 {k:'ask',q:'Your questions for them',t:'Examples: "What would a typical first project look like for a junior?" · "How is work split between desk research, modelling and client meetings?" · "How is the team using AI in market monitoring?" · "What does a strong first year look like?"'}
];

// ---- 7. Concept quiz ----
const IV_QUIZ=[
 ['Which body operates Galileo and EGNOS and leads their market uptake?',['EUSPA','ESA','EU SatCen','European Defence Agency'],'EUSPA, the EU agency in Prague. ESA is intergovernmental and acts as technical authority.'],
 ['ESA is…',['an intergovernmental organisation, not an EU body','an EU agency under DG DEFIS','a Commission directorate-general','a public-private partnership'],'ESA has non-EU member states (UK, Switzerland, Norway).'],
 ['Copernicus data policy is…',['free, full and open','free for public bodies only','paid per scene','restricted to EU companies'],'Free and open data for everyone.'],
 ['Sentinel-1 carries…',['a C-band synthetic aperture radar','a multispectral optical imager','an atmospheric spectrometer','a radar altimeter for sea level only'],'Radar sees at night and through clouds. The multispectral optical imager is on Sentinel-2.'],
 ['Galileo OSNMA provides…',['authentication of the navigation message against spoofing','free 20 cm corrections','an encrypted service for governments','a return link for search and rescue'],'OSNMA, initial service since July 2025. 20 cm is HAS; the encrypted service is PRS.'],
 ['Galileo HAS is…',['a free high-accuracy correction service (around 20 cm)','a paid commercial authentication service','the encrypted governmental service','a ground augmentation for aviation'],'Initial service since January 2023.'],
 ['EGNOS is…',['an SBAS improving GPS accuracy and integrity over Europe','a second Galileo constellation','an EO satellite','a secure satcom system'],'Used mainly for precision approaches in aviation.'],
 ['IRIS² is…',['a multi-orbit secure connectivity constellation under a public-private concession','a new Copernicus satellite','a LEO navigation demonstrator','an EU space traffic regulation'],'Concession with SpaceRISE (SES, Eutelsat, Hispasat), signed in December 2024.'],
 ['GOVSATCOM is about…',['pooling and sharing secure satcom capacity for governmental users','a global navigation service','debris tracking','free broadband for citizens'],'A component of the EU Space Programme 2021-2027.'],
 ['Downstream space refers to…',['products and services using space signals and data','satellite manufacturing','launch services','ground station construction'],'The focus of the MIST team.'],
 ['In the economic analysis of a CBA, taxes and subsidies are…',['excluded, because they are transfers','added to benefits','added to costs','counted twice'],'Excluded: they move resources without creating them.'],
 ['A benefit-cost ratio of 1.3 means…',['present value of benefits is 30% higher than present value of costs','NPV equals 1.3 million','the IRR is 13%','payback takes 1.3 years'],'B/C = PV of benefits / PV of costs.'],
 ['In the Commission CBA guide, a variable is critical when…',['a 1% change moves NPV by more than 1%','it changes the sign of the NPV','it is the largest cost item','it has the highest uncertainty'],'Definition from the 2014 Guide.'],
 ['A switching value is…',['the change in a variable that makes NPV equal to zero','the discount rate that maximises NPV','the value of the project at the end of the period','the exchange rate used in the analysis'],'For benefits: NPV / PV of benefits.'],
 ['The counterfactual in a CBA is…',['the scenario without the intervention','the most optimistic scenario','the financial analysis','the sensitivity analysis'],'Everything is measured as the difference with and without the intervention.'],
 ['Better Regulation evaluation criteria are…',['effectiveness, efficiency, relevance, coherence, EU added value','effectiveness, efficiency, impact, sustainability, relevance','cost, time, quality, scope, risk','relevance, legality, transparency, value, impact'],'The second list resembles the OECD-DAC criteria: that is the trap.'],
 ['The main finding of ECA Special Report 07/2021 was…',['uptake below potential and no comprehensive strategy with measurable targets','Galileo is over budget','Copernicus data are too expensive','EUSPA should be merged with ESA'],'Strategy, measurement of benefits, integrated data access.'],
 ['The three pillars of the proposed EU Space Act are…',['safety, resilience, sustainability','funding, procurement, launch','research, industry, defence','data, AI, connectivity'],'COM(2025) 335, June 2025.'],
 ['Why consider LEO for positioning, navigation and timing?',['stronger signals and faster geometry: more resilience to jamming, faster convergence','it replaces Galileo','it only needs one satellite','it covers only Europe'],'A complement to Galileo, not a replacement. ESA Celeste demonstrator, first launches in March 2026.'],
 ['A market grows from 100 to 200 in 10 years. Approximate CAGR?',['about 7%','10%','20%','5%'],'Rule of 72: 72/10 ≈ 7.2%. Exact: 2^(1/10) − 1 = 7.18%.'],
 ['Bottom-up market sizing starts from…',['number of users × adoption × price','total market × market share','GDP × share of space','last year revenue × growth'],'The second option is top-down.'],
 ['Contingent valuation measures…',['stated willingness to pay','observed market prices','avoided costs','shadow wage rates'],'A sample of people is asked how much they would pay.'],
 ['In a CBA at constant prices you should use…',['a real discount rate','a nominal discount rate','the inflation rate','no discounting'],'Constant prices with a real rate, current prices with a nominal rate.'],
 ['A receiver uses GPS and Galileo. The benefit attributable to Galileo is…',['its marginal contribution (availability, authentication, resilience)','the full benefit of positioning','zero, because GPS is enough','half of the benefit by default'],'The key point in any GNSS cost-benefit analysis.']
];

// ---- Generated numerical exercises ----
const ivR=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const ivPick=a=>a[Math.floor(Math.random()*a.length)];
function ivOpts(v,ds,fmt){
  const vals=[v], gap=Math.max(Math.abs(v)*0.04,0.05), far=x=>vals.every(y=>Math.abs(y-x)>gap&&fmt(y)!==fmt(x));
  ds.forEach(d=>{ if(Number.isFinite(d)&&far(d)) vals.push(d); });
  let k=1; while(vals.length<4&&k<60){ const c=v+(k%2?1:-1)*Math.max(Math.abs(v),2)*(0.1+0.06*Math.ceil(k/2)); if(far(c)) vals.push(c); k++; }
  const sel=vals.slice(0,4), order=sel.map((x,i)=>i).sort(()=>Math.random()-.5);
  return {opts:order.map(i=>fmt(sel[i])), key:order.indexOf(0)};
}
const ivM=x=>(x<0?'−€':'€')+nf(Math.abs(x),1)+'m', ivP=x=>nf(x*100,1)+'%';
const IV_EX=[
 {t:'NPV',make(){ const r=ivPick([3,4,5])/100, n=ivPick([5,8,10]), B=ivR(3,9)*5; const af=(1-Math.pow(1+r,-n))/r; const I=Math.round(B*af*(0.7+Math.random()*0.5)); const v=-I+B*af;
   return {q:`An EU programme costs €${I}m in year 0 and generates benefits of €${B}m per year in years 1 to ${n}. Using a ${r*100}% discount rate, what is the NPV?`,
    ...ivOpts(v,[B*n-I,B*af*(1+r)-I,-I+B*((1-Math.pow(1+r+.02,-n))/(r+.02))],ivM),
    ex:`Annuity factor = (1 − 1.0${r*100}^−${n}) / ${r} = ${nf(af,3)}. PV of benefits = ${B} × ${nf(af,3)} = €${nf(B*af,1)}m. NPV = ${nf(B*af,1)} − ${I} = €${nf(v,1)}m. Traps: not discounting (${nf(B*n-I,1)}), discounting from year 0.`}; }},
 {t:'B/C ratio',make(){ const r=ivPick([3,4]), n=ivPick([10,15]); const af=(1-Math.pow(1+r/100,-n))/(r/100); const I=ivR(20,60)*5, O=ivR(2,8), C=I+O*af; const PB=Math.round(C*(0.8+Math.random()*0.9)); const v=PB/C;
   return {q:`Present value of benefits: €${PB}m. Costs: investment of €${I}m in year 0 and operating costs of €${O}m per year for ${n} years. The annuity factor at ${r}% for ${n} years is ${nf(af,2)}. What is the benefit-cost ratio?`,
    ...ivOpts(v,[PB/I,PB/(I+O*n),(PB-C)/C],x=>nf(x,2)),
    ex:`PV of costs = ${I} + ${O} × ${nf(af,2)} = €${nf(C,1)}m. B/C = ${PB} / ${nf(C,1)} = ${nf(v,2)}. ${v>=1?'Above 1: benefits exceed costs.':'Below 1: costs exceed benefits.'} Traps: forgetting operating costs, not discounting them.`}; }},
 {t:'CAGR',make(){ const n=ivPick([5,8,10]), g=ivR(4,13)/100, S=ivR(3,40)*10; const E=Math.round(S*Math.pow(1+g,n)); const v=Math.pow(E/S,1/n)-1;
   return {q:`A downstream market grows from €${S}bn to €${E}bn in ${n} years. What is the compound annual growth rate?`,
    ...ivOpts(v,[(E/S-1)/n,E/S-1,(E-S)/E/n],ivP),
    ex:`CAGR = (${E}/${S})^(1/${n}) − 1 = ${nf(E/S,3)}^(${nf(1/n,3)}) − 1 = ${nf(v*100,1)}%. The simple average (${nf((E/S-1)/n*100,1)}%) overstates growth.`}; }},
 {t:'Rule of 72',make(){ const g=ivPick([4,6,8,9,12]); const v=72/g;
   return {q:`A market grows by ${g}% a year. Approximately how many years does it take to double?`,
    ...ivOpts(v,[100/g,50/g,2*72/g],x=>nf(x,0)+' years'),
    ex:`Rule of 72: 72 / ${g} ≈ ${nf(v,0)} years. Exact: ln 2 / ln(1.${String(g).padStart(2,'0')}) = ${nf(Math.log(2)/Math.log(1+g/100),1)}.`}; }},
 {t:'Bottom-up sizing',make(){ const N=ivR(15,60)*10000, a=ivPick([5,8,10,12,15,20]), p=ivPick([300,450,600,800,1200]); const v=N*a/100*p/1e6;
   return {q:`There are ${nf(N)} farms above 50 ha in the target countries. You assume ${a}% adopt a satellite-based advisory service at €${nf(p)} per year. What is the annual market?`,
    ...ivOpts(v,[N*p/1e6,v*12,v/10],ivM),
    ex:`${nf(N)} × ${a}% × €${nf(p)} = €${nf(v,1)}m per year. Traps: forgetting adoption (€${nf(N*p/1e6,1)}m) or mixing monthly and annual. Then cross-check with a top-down figure.`}; }},
 {t:'Switching value',make(){ const PB=ivR(30,90)*10, PC=Math.round(PB*(0.55+Math.random()*0.35)); const v=(PB-PC)/PB;
   return {q:`PV of benefits is €${PB}m and PV of costs is €${PC}m. By how much can benefits fall before the NPV becomes zero?`,
    ...ivOpts(v,[(PB-PC)/PC,PC/PB,1-PC/PB*0.9],ivP),
    ex:`NPV = ${PB} − ${PC} = €${PB-PC}m. Switching value of benefits = NPV / PV of benefits = ${PB-PC} / ${PB} = ${nf(v*100,1)}%. If it is low, the result is fragile.`}; }},
 {t:'Attribution',make(){ const B=ivR(20,90)*10, s=ivPick([60,70,80,90]), a=ivPick([10,15,20,25,30]); const v=B*s/100*a/100;
   return {q:`Precision-agriculture positioning generates €${B}m of annual benefits. ${s}% of receivers in use are Galileo-enabled, and you estimate that ${a}% of the benefit for those users depends on Galileo specifically. What benefit do you attribute to Galileo?`,
    ...ivOpts(v,[B*s/100,B*a/100,B],ivM),
    ex:`${B} × ${s}% × ${a}% = €${nf(v,1)}m. Galileo's benefit is marginal with respect to GPS: attributing all of it (€${B}m) is the most common mistake.`}; }},
 {t:'Present value',make(){ const X=ivR(5,40)*10, r=ivPick([3,4,5]), t=ivPick([5,10,15,20]); const v=X/Math.pow(1+r/100,t);
   return {q:`What is the present value of €${X}m received in year ${t}, discounted at ${r}%?`,
    ...ivOpts(v,[X/(1+r*t/100),X*(1-r*t/100),X*Math.pow(1+r/100,t)],ivM),
    ex:`${X} / 1.0${r}^${t} = ${X} / ${nf(Math.pow(1+r/100,t),3)} = €${nf(v,1)}m. Discounting is compound, not linear.`}; }}
];

function renderInterview(tab){
  if(tab) IVV.tab=tab; const D=ivDB(); const t=IVV.tab;
  let body='';
  if(t==='req') body=`<p class="small muted">Typical requirements for a junior consulting role. For each one: what they look for, how to prove it, the likely question. Write your own example in the box: it stays in this browser only.</p>`+IV_REQ.map(r=>`<section class="panel stack"><h3>${esc(r.r)}</h3><dl class="dl"><dt>What they look for</dt><dd>${esc(r.they)}</dd><dt>How to prove it</dt><dd>${esc(r.prove)}</dd><dt>Likely question</dt><dd><i>${esc(r.q)}</i></dd></dl><textarea class="ivnote" data-ivn="req-${r.k}" rows="3" placeholder="Your concrete example (situation, what you did, result with numbers)">${esc(D.notes['req-'+r.k]||'')}</textarea></section>`).join('');
  else if(t==='space') body=`<p class="small muted">Facts checked in November 2026 against official sources (European Commission, EUSPA, ESA, European Court of Auditors). Before the interview, re-check the items marked <b>check</b>.</p>`+IV_SPACE.map(s=>`<section class="panel stack ivtext"><h2>${s.h}</h2>${s.b}</section>`).join('');
  else if(t==='meth') body=IV_METH.map(s=>`<section class="panel stack ivtext"><h2>${s.h}</h2>${s.b}</section>`).join('')+`<div class="row"><button class="primary" data-ivt="ex">Try the numerical exercises</button></div>`;
  else if(t==='proj') body=`<p class="small muted">Typical policy and market consulting projects (sector module: EU space): you may be asked how you would work on one of them.</p>`+IV_PROJ.map(p=>`<section class="panel stack"><h3>${esc(p.t)}</h3><dl class="dl"><dt>What it is</dt><dd>${esc(p.what)}</dd><dt>Your role as a junior</dt><dd>${esc(p.you)}</dd><dt>Method</dt><dd>${esc(p.m)}</dd><dt>Trap</dt><dd>${esc(p.trap)}</dd><dt>Possible question</dt><dd><i>${esc(p.q)}</i></dd></dl></section>`).join('');
  else if(t==='tq') body=`<p class="small muted">Answer out loud in 60-90 seconds, then open the model answer. Don't memorise it: take the structure.</p>`+IV_TQ.map((x,i)=>`<section class="panel stack"><h3>${i+1}. ${esc(x.q)}</h3><details><summary>Model answer</summary><p class="ivans">${esc(x.a)}</p>${x.n?`<p class="small muted">${esc(x.n)}</p>`:''}</details></section>`).join('');
  else if(t==='bq') body=`<p class="small muted">STAR structure: Situation, Task, Action (the longest part, in the first person), Result with numbers. Your answers stay in this browser only.</p>`+IV_BQ.map(x=>`<section class="panel stack"><h3>${esc(x.q)}</h3><p class="small">${esc(x.t)}</p><textarea class="ivnote" data-ivn="bq-${x.k}" rows="5" placeholder="${x.k==='ask'?'Your questions':'Situation · Task · Action · Result'}">${esc(D.notes['bq-'+x.k]||'')}</textarea></section>`).join('');
  else if(t==='ex') body=ivExHTML();
  else if(t==='quiz') body=ivQuizHTML();
  app().innerHTML=header('Business case & interview','Consulting case skills: cost-benefit analysis, market sizing, evaluation, interview questions. Sector module: EU space.')+`
  <main class="wrap stack" lang="en">
    <p class="row spread small"><span class="muted">All the theory in one document, with worked examples.</span><a href="theory/case-theory-handbook.pdf" target="_blank" rel="noopener"><b>Download the theory handbook (PDF, 32 pages)</b></a></p>
    <nav class="ivtabs" aria-label="Sections">${IV_TABS.map(([k,l])=>`<button class="${t===k?'on':''}" data-ivt="${k}">${l}</button>`).join('')}</nav>
    ${body}
  </main>${footer()}`;
  bindNav();
  document.querySelectorAll('[data-ivt]').forEach(b=>b.onclick=()=>{ renderInterview(b.dataset.ivt); window.scrollTo(0,0); });
  document.querySelectorAll('.ivnote').forEach(a=>a.oninput=()=>{ ivDB().notes[a.dataset.ivn]=a.value; clearTimeout(a._t); a._t=setTimeout(saveDB,400); });
  if(t==='ex') ivExBind();
  if(t==='quiz') ivQuizBind();
}
function ivExHTML(){
  const D=ivDB(); if(!IVV.ex) IVV.ex=ivNewEx(); const X=IVV.ex;
  return `<section class="panel stack"><div class="row spread"><span class="eyebrow">${esc(X.t)}</span><span class="small mono">Correct ${D.ex.ok}/${D.ex.n}</span></div>
    <p class="ivq">${esc(X.q)}</p>
    <div class="ivopts">${X.opts.map((o,i)=>`<button class="ivopt ${X.ans!==undefined?(i===X.key?'ok':i===X.ans?'bad':''):''}" data-ixo="${i}" ${X.ans!==undefined?'disabled':''}><b>${'ABCD'[i]}</b> ${esc(o)}</button>`).join('')}</div>
    ${X.ans!==undefined?`<div class="note ${X.ans===X.key?'okn':'badn'}"><b>${X.ans===X.key?'Correct.':'Wrong: the answer is '+'ABCD'[X.key]+'.'}</b> ${esc(X.ex)}</div>`:'<p class="small muted">Pen, paper and a calculator are fine: the method is what counts here.</p>'}
    <div class="row"><button class="primary" id="ix-next">${X.ans!==undefined?'New exercise':'Skip'}</button><label class="row small">Type <select id="ix-type"><option value="">Mixed</option>${IV_EX.map((e,i)=>`<option value="${i}" ${IVV.exType===String(i)?'selected':''}>${e.t}</option>`).join('')}</select></label></div></section>`;
}
function ivNewEx(){ const i=IVV.exType?+IVV.exType:Math.floor(Math.random()*IV_EX.length); return Object.assign({t:IV_EX[i].t},IV_EX[i].make()); }
function ivExBind(){
  document.querySelectorAll('[data-ixo]').forEach(b=>b.onclick=()=>{ const X=IVV.ex; if(X.ans!==undefined) return; X.ans=+b.dataset.ixo; const D=ivDB(); D.ex.n++; if(X.ans===X.key) D.ex.ok++; saveDB(); renderInterview('ex'); });
  $('#ix-next').onclick=()=>{ IVV.ex=ivNewEx(); renderInterview('ex'); };
  $('#ix-type').onchange=e=>{ IVV.exType=e.target.value; IVV.ex=ivNewEx(); renderInterview('ex'); };
}
function ivQuizHTML(){
  const D=ivDB();
  if(!IVV.quiz) IVV.quiz={order:IV_QUIZ.map((_,i)=>i).sort(()=>Math.random()-.5),i:0,ok:0,ans:undefined,perm:null};
  const Q=IVV.quiz;
  if(Q.i>=Q.order.length) return `<section class="panel stack"><h2>Quiz finished: ${Q.ok}/${Q.order.length}</h2><p>${Q.ok>=Q.order.length*0.85?'Solid foundation.':'Re-read the EU space and Methods tabs, then try again.'}</p><div class="row"><button class="primary" id="iq-restart">Start again</button></div></section>`;
  const it=IV_QUIZ[Q.order[Q.i]]; if(!Q.perm) Q.perm=it[1].map((_,i)=>i).sort(()=>Math.random()-.5);
  const key=Q.perm.indexOf(0);
  return `<section class="panel stack"><div class="row spread"><span class="eyebrow">Question ${Q.i+1} of ${Q.order.length}</span><span class="small mono">All-time ${D.quiz.ok}/${D.quiz.n}</span></div>
    <p class="ivq">${esc(it[0])}</p>
    <div class="ivopts">${Q.perm.map((j,i)=>`<button class="ivopt ${Q.ans!==undefined?(i===key?'ok':i===Q.ans?'bad':''):''}" data-iqo="${i}" ${Q.ans!==undefined?'disabled':''}><b>${'ABCD'[i]}</b> ${esc(it[1][j])}</button>`).join('')}</div>
    ${Q.ans!==undefined?`<div class="note ${Q.ans===key?'okn':'badn'}"><b>${Q.ans===key?'Correct.':'Wrong.'}</b> ${esc(it[2])}</div><div class="row"><button class="primary" id="iq-next">Next</button></div>`:''}</section>`;
}
function ivQuizBind(){
  const Q=IVV.quiz;
  document.querySelectorAll('[data-iqo]').forEach(b=>b.onclick=()=>{ if(Q.ans!==undefined) return; Q.ans=+b.dataset.iqo; const ok=Q.ans===Q.perm.indexOf(0); if(ok) Q.ok++; const D=ivDB(); D.quiz.n++; if(ok) D.quiz.ok++; saveDB(); renderInterview('quiz'); });
  const n=$('#iq-next'); if(n) n.onclick=()=>{ Q.i++; Q.ans=undefined; Q.perm=null; renderInterview('quiz'); };
  const r=$('#iq-restart'); if(r) r.onclick=()=>{ IVV.quiz=null; renderInterview('quiz'); };
}
