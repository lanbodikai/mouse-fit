"use client";

import {
  startTransition,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Database,
  Fingerprint,
  MousePointer2,
  Ruler,
  ScanLine,
  Target,
} from "lucide-react";
import styles from "./page.module.css";

const navSections = [
  { id: "scan", label: "Scan" },
  { id: "matching", label: "Matching" },
  { id: "database", label: "Database" },
] as const;

const scanSteps = [
  {
    title: "Measure the hand",
    body: "Capture length, width, finger reach, and joint position so the fit starts with your actual proportions.",
    icon: Ruler,
  },
  {
    title: "Read the grip",
    body: "Classify palm contact, arch height, and finger curl instead of treating every hand like a flat outline.",
    icon: Fingerprint,
  },
  {
    title: "Rank the shape",
    body: "Compare your profile against mouse width, hump placement, side flare, and support zones.",
    icon: Target,
  },
] as const;

const matchRows = [
  {
    rank: "01",
    model: "Logitech G Pro X Superlight 2",
    fit: "92",
    reason: "Neutral shell, safe rear support, low side flare",
  },
  {
    rank: "02",
    model: "Pulsar X2V2",
    fit: "89",
    reason: "Compact grip span with strong claw control",
  },
  {
    rank: "03",
    model: "Razer DeathAdder V3 Pro",
    fit: "83",
    reason: "Better for relaxed palm with wider right-side support",
  },
] as const;

const fitFacts = [
  { label: "Hand length", value: "18.7 cm" },
  { label: "Grip style", value: "Relaxed claw" },
  { label: "Support bias", value: "Rear palm" },
  { label: "Shape risk", value: "Wide front flare" },
] as const;

const geometryGroups = [
  {
    label: "Mouse geometry",
    value: "Width, length, height, hump, flare",
  },
  {
    label: "Grip behavior",
    value: "Palm contact, curl, lift, stability",
  },
  {
    label: "Decision output",
    value: "Best fit, safe swaps, avoid notes",
  },
] as const;

const easeOutExpo = [0.16, 1, 0.3, 1] as const;

const reveal: Variants = {
  hidden: {
    y: 34,
    opacity: 0.3,
    filter: "blur(8px)",
  },
  show: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.9,
      ease: easeOutExpo,
    },
  },
};

const stagger: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.11,
      delayChildren: 0.08,
    },
  },
};

const staggerItem: Variants = {
  hidden: {
    y: 24,
    opacity: 0.35,
  },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.72,
      ease: easeOutExpo,
    },
  },
};

type MediaAssetProps = {
  src: string;
  alt: string;
  className?: string;
  showScan?: boolean;
};

function MediaAsset({
  src,
  alt,
  className = "",
  showScan = false,
}: MediaAssetProps) {
  return (
    <div className={`${styles.mediaPlaceholder} ${styles.mediaAsset} ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 820px) 100vw, (max-width: 1080px) 78vw, 52vw"
        className={styles.mediaImage}
      />
      {showScan ? <span className={styles.scanSweep} aria-hidden /> : null}
    </div>
  );
}

export default function LandingPage() {
  const prefersReducedMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const [activeSection, setActiveSection] =
    useState<(typeof navSections)[number]["id"]>("scan");

  // Supabase falls back to the site's root URL when an OAuth callback URL is
  // missing from its allow-list. Preserve the authorization response and send
  // it through the normal callback handler instead of leaving a signed-in user
  // on the marketing page.
  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const hashParams = new URLSearchParams(currentUrl.hash.slice(1));
    const isOAuthResponse =
      currentUrl.searchParams.has("code") ||
      currentUrl.searchParams.has("error") ||
      currentUrl.searchParams.has("error_description") ||
      hashParams.has("access_token") ||
      hashParams.has("error") ||
      hashParams.has("error_description");

    if (!isOAuthResponse) return;

    window.location.replace(`/auth/callback${currentUrl.search}${currentUrl.hash}`);
  }, []);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const mediaY = useTransform(scrollYProgress, [0, 1], [0, 96]);
  const panelY = useTransform(scrollYProgress, [0, 1], [0, -42]);

  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-landing-section]"),
    );

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (left, right) =>
              right.intersectionRatio - left.intersectionRatio,
          )[0];

        if (!visibleEntry) {
          return;
        }

        startTransition(() => {
          setActiveSection(
            visibleEntry.target.id as (typeof navSections)[number]["id"],
          );
        });
      },
      {
        threshold: [0.24, 0.45, 0.68],
        rootMargin: "-14% 0px -46% 0px",
      },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const initialState = prefersReducedMotion ? false : "hidden";

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>

      <header className={styles.header}>
        <nav className={styles.nav} aria-label="Primary navigation">
          <Link href="/" className={styles.brand} aria-label="MouseFit home">
            <span className={styles.brandMark}>
              <MousePointer2 size={17} strokeWidth={2} />
            </span>
            <span>MouseFit</span>
          </Link>

          <div className={styles.navLinks}>
            {navSections.map((section) => (
              <Link
                key={section.id}
                href={`#${section.id}`}
                className={`${styles.navLink} ${
                  activeSection === section.id ? styles.navLinkActive : ""
                }`}
              >
                {section.label}
              </Link>
            ))}
          </div>

          <div className={styles.navActions}>
            <Link href="/database" className={styles.textAction}>
              Explore mice
            </Link>
          <Link href="/survey" className={styles.primaryAction}>
              Scan my hand
              <ArrowUpRight size={16} strokeWidth={2} />
            </Link>
          </div>
        </nav>
      </header>

      <main id="main-content">
        <section
          ref={heroRef}
          id="scan"
          data-landing-section
          className={styles.hero}
        >
          <motion.div
            className={styles.heroCopy}
            variants={stagger}
            initial={initialState}
            animate="show"
          >
            <motion.p variants={staggerItem} className={styles.heroLabel}>
              Hand scan to mouse shortlist
            </motion.p>
            <motion.h1 variants={staggerItem} className={styles.headline}>
              Find the mouse that fits your hand and grip.
            </motion.h1>
            <motion.p variants={staggerItem} className={styles.heroText}>
              MouseFit turns hand measurements and grip behavior into a ranked
              shortlist, with clear reasons behind every recommendation.
            </motion.p>
            <motion.div variants={staggerItem} className={styles.ctaRow}>
              <Link href="/survey" className={styles.primaryActionLarge}>
                Start the scan
                <ArrowRight size={18} strokeWidth={2} />
              </Link>
              <Link href="/database" className={styles.secondaryAction}>
                Explore mice
              </Link>
            </motion.div>

            <motion.dl variants={staggerItem} className={styles.heroFacts}>
              {fitFacts.slice(0, 2).map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </motion.dl>
          </motion.div>

          <motion.div
            className={styles.heroMedia}
            initial={
              prefersReducedMotion
                ? false
                : { clipPath: "inset(0 0 100% 0)", scale: 1.035 }
            }
            animate={{ clipPath: "inset(0 0 0% 0)", scale: 1 }}
            transition={{ duration: 1.25, delay: 0.12, ease: easeOutExpo }}
            style={prefersReducedMotion ? undefined : { y: mediaY }}
          >
            <MediaAsset
              src="/images/landing/hero-mousefit.png"
              alt="Hand on a mousepad with a green measurement scan and a mouse beside it"
              className={styles.heroPlaceholder}
              showScan
            />
          </motion.div>

          <motion.aside
            className={styles.fitPanel}
            initial={
              prefersReducedMotion
                ? false
                : { opacity: 0.25, x: 44, y: 28, scale: 0.96 }
            }
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.72, ease: easeOutExpo }}
            style={prefersReducedMotion ? undefined : { translateY: panelY }}
            aria-label="Example fit profile"
          >
            <div className={styles.panelHeading}>
              <span>Live fit profile</span>
              <BadgeCheck size={17} strokeWidth={1.8} />
            </div>
            <div className={styles.fitScore}>
              <span>Top fit</span>
              <strong>92</strong>
            </div>
            <dl className={styles.fitFacts}>
              {fitFacts.slice(2).map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </motion.aside>
        </section>

        <motion.section
          className={styles.processSection}
          aria-label="How MouseFit works"
          variants={stagger}
          initial={initialState}
          whileInView="show"
          viewport={{ once: true, amount: 0.22 }}
        >
          <div className={styles.processLead}>
            <span>How it works</span>
            <strong>One fit profile, three decisions.</strong>
          </div>
          <div className={styles.processList}>
            {scanSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <motion.article
                  key={step.title}
                  variants={staggerItem}
                  className={styles.processItem}
                  whileHover={
                    prefersReducedMotion ? undefined : { y: -6, x: 3 }
                  }
                >
                  <span className={styles.processNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Icon size={20} strokeWidth={1.8} />
                  <h2>{step.title}</h2>
                  <p>{step.body}</p>
                </motion.article>
              );
            })}
          </div>
        </motion.section>

        <section
          id="matching"
          data-landing-section
          className={styles.matching}
        >
          <motion.div
            variants={reveal}
            initial={initialState}
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            className={styles.sectionHeading}
          >
            <span>Recommendation logic</span>
            <h2>
              Every score
              <br />
              needs a reason.
            </h2>
          </motion.div>

          <div className={styles.matchingGrid}>
            <motion.div
              variants={reveal}
              initial={initialState}
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              className={styles.matchingMedia}
            >
              <MediaAsset
                src="/images/landing/recommendation-mousefit.png"
                alt="Hand holding a mouse in a natural grip position"
                className={styles.portraitPlaceholder}
              />
            </motion.div>

            <div className={styles.matchingContent}>
              <motion.div
                variants={reveal}
                initial={initialState}
                whileInView="show"
                viewport={{ once: true, amount: 0.3 }}
                className={styles.matchingIntro}
              >
                <p>
                  MouseFit explains what matches your hand and what could feel
                  wrong before you buy. The result stays inspectable instead of
                  hiding behind one unexplained number.
                </p>
              </motion.div>

              <motion.div
                className={styles.matchRows}
                variants={stagger}
                initial={initialState}
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
              >
                <div className={styles.matchRowsHeading}>
                  <div className={styles.matchingMeta}>
                    <span>
                      <ScanLine size={17} strokeWidth={1.8} />
                      Ranked shortlist
                    </span>
                    <strong>3 matches</strong>
                  </div>
                </div>
                {matchRows.map((row) => (
                  <motion.article
                    key={row.model}
                    variants={staggerItem}
                    className={styles.matchRow}
                    whileHover={
                      prefersReducedMotion ? undefined : { x: 8, scale: 1.008 }
                    }
                  >
                    <span className={styles.matchRank}>{row.rank}</span>
                    <div className={styles.matchName}>
                      <strong>{row.model}</strong>
                      <span>{row.reason}</span>
                    </div>
                    <b>{row.fit}</b>
                  </motion.article>
                ))}
              </motion.div>

              <motion.div
                variants={reveal}
                initial={initialState}
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                className={styles.signalBlock}
              >
                <h3>Built around fit signals, not hype.</h3>
                <p>
                  The model balances comfort, control, and risk by weighing
                  geometry against your measured grip.
                </p>
                <div className={styles.signalList}>
                  <span>Hump height</span>
                  <span>Front width</span>
                  <span>Side curve</span>
                  <span>Grip span</span>
                  <span>Weight class</span>
                  <span>Support zone</span>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section
          id="database"
          data-landing-section
          className={styles.databaseSection}
        >
          <motion.div
            variants={reveal}
            initial={initialState}
            whileInView="show"
            viewport={{ once: true, amount: 0.35 }}
            className={styles.databaseHeading}
          >
            <span>Shape database</span>
            <h2>Compare mice by the details your hand can feel.</h2>
            <p>
              After the scan, inspect dimensions, filter by grip needs, and
              compare alternatives that solve the same fit problem.
            </p>
          </motion.div>

          <div className={styles.databaseShowcase}>
            <motion.div
              variants={reveal}
              initial={initialState}
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              className={styles.databaseMedia}
            >
              <MediaAsset
                src="/images/landing/database-mousefit.png"
                alt="Mouse comparison board with dimensional guides and calipers"
                className={styles.databasePlaceholder}
              />
              <Link href="/database" className={styles.mediaCta}>
                Open database
                <Database size={17} strokeWidth={1.8} />
              </Link>
            </motion.div>

            <motion.div
              className={styles.geometryList}
              variants={stagger}
              initial={initialState}
              whileInView="show"
              viewport={{ once: true, amount: 0.28 }}
            >
              {geometryGroups.map((group, index) => (
                <motion.article
                  key={group.label}
                  variants={staggerItem}
                  className={styles.geometryItem}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{group.label}</h3>
                    <p>{group.value}</p>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>

        <motion.section
          className={styles.finalCta}
          variants={reveal}
          initial={initialState}
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
        >
          <div>
            <span>Ready to find your fit?</span>
            <h2>Stop guessing from spec sheets.</h2>
            <p>
              Start with your hand, validate the shortlist, and choose with
              context.
            </p>
          </div>
          <Link href="/survey" className={styles.primaryActionLarge}>
            Scan my hand
            <ArrowUpRight size={18} strokeWidth={2} />
          </Link>
        </motion.section>
      </main>
    </div>
  );
}
