/**
 * Database seed. Populates demo data so the platform is usable immediately
 * after `npm run prisma:seed`.
 *
 * Demo credentials:
 *   Admin   -> admin@wealthdesk.in  / Admin@12345
 *   Member  -> member@wealthdesk.in / Member@12345
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { LEGAL_DOCS, LEGAL_SLUGS } from "../lib/legal";
import { encryptPii, blindIndex } from "../lib/pii";

const prisma = new PrismaClient();

/** Encrypted PAN/Aadhaar + blind-index hashes for a demo user. */
function kyc(pan: string, aadhaar: string) {
  return {
    panNumber: encryptPii(pan),
    aadhaarNumber: encryptPii(aadhaar),
    panHash: blindIndex(pan),
    aadhaarHash: blindIndex(aadhaar)
  };
}

const adminKyc = kyc("ADMIN1234A", "100000000001");
const memberKyc = kyc("MEMBR5678M", "200000000002");

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log("Seeding Wealth Research Desk...");

  // --- Users -------------------------------------------------------------
  const adminHash = await bcrypt.hash("Admin@12345", 12);
  const memberHash = await bcrypt.hash("Member@12345", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@wealthdesk.in" },
    update: {
      name: "Platform Administrator",
      phone: "9000000001",
      ...adminKyc,
      passwordHash: adminHash,
      role: "ADMIN",
      isBanned: false,
      bannedReason: null,
      phoneVerifiedAt: new Date(),
      emailVerifiedAt: new Date(),
      legalAcceptedAt: new Date()
    },
    create: {
      name: "Platform Administrator",
      email: "admin@wealthdesk.in",
      phone: "9000000001",
      ...adminKyc,
      passwordHash: adminHash,
      role: "ADMIN",
      phoneVerifiedAt: new Date(),
      emailVerifiedAt: new Date(),
      legalAcceptedAt: new Date()
    }
  });

  const member = await prisma.user.upsert({
    where: { email: "member@wealthdesk.in" },
    update: {
      name: "Demo Member",
      phone: "9000000002",
      ...memberKyc,
      passwordHash: memberHash,
      role: "USER",
      isBanned: false,
      bannedReason: null,
      phoneVerifiedAt: new Date(),
      legalAcceptedAt: new Date()
    },
    create: {
      name: "Demo Member",
      email: "member@wealthdesk.in",
      phone: "9000000002",
      ...memberKyc,
      passwordHash: memberHash,
      role: "USER",
      phoneVerifiedAt: new Date(),
      legalAcceptedAt: new Date()
    }
  });

  // --- Analysts ----------------------------------------------------------
  const analystA = await prisma.analyst.upsert({
    where: { email: "r.iyer@wealthdesk.in" },
    update: {},
    create: {
      name: "Ravi Iyer",
      email: "r.iyer@wealthdesk.in",
      experienceYears: 14,
      specialization: "Index & Stock Derivatives",
      sebiRegistration: "INH000012345",
      bio: "Fourteen years analysing index option flows and institutional positioning across NSE derivatives.",
      isActive: true
    }
  });

  const analystB = await prisma.analyst.upsert({
    where: { email: "s.menon@wealthdesk.in" },
    update: {},
    create: {
      name: "Sneha Menon",
      email: "s.menon@wealthdesk.in",
      experienceYears: 9,
      specialization: "Equity Cash & Swing Setups",
      sebiRegistration: "INH000067890",
      bio: "Specialist in positional equity research with a focus on disciplined risk-defined swing trades.",
      isActive: true
    }
  });

  // --- Plans -------------------------------------------------------------
  const plans = [
    {
      code: "TRIAL",
      name: "5-Day Trial",
      description: "A one-time taste of the research desk.",
      amountPaise: 0,
      durationDays: 5,
      isTrial: true,
      features: ["Curated sample of live trades", "Daily market outlook", "Dashboard notifications"],
      sortOrder: 0
    },
    {
      code: "MONTHLY",
      name: "Monthly Membership",
      description: "Full research access, billed monthly.",
      amountPaise: 249900,
      durationDays: 30,
      isTrial: false,
      features: [
        "All live trades with entries, stop-loss & targets",
        "Daily market outlook",
        "Trade history & performance",
        "Email & Telegram alerts"
      ],
      sortOrder: 1
    },
    {
      code: "QUARTERLY",
      name: "Quarterly Membership",
      description: "Best value for committed members.",
      amountPaise: 599900,
      durationDays: 90,
      isTrial: false,
      features: [
        "Everything in Monthly",
        "Priority support",
        "Quarterly strategy review note"
      ],
      sortOrder: 2
    },
    {
      code: "ANNUAL",
      name: "Annual Membership",
      description: "Maximum savings for the full year.",
      amountPaise: 1999900,
      durationDays: 365,
      isTrial: false,
      features: [
        "Everything in Quarterly",
        "Dedicated relationship manager",
        "Early access to new research formats"
      ],
      sortOrder: 3
    }
  ];

  for (const plan of plans) {
    await prisma.planConfig.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        description: plan.description,
        amountPaise: plan.amountPaise,
        durationDays: plan.durationDays,
        isTrial: plan.isTrial,
        features: plan.features,
        sortOrder: plan.sortOrder
      },
      create: plan
    });
  }

  // --- Trades ------------------------------------------------------------
  const existingTrades = await prisma.trade.count();
  if (existingTrades === 0) {
    await prisma.trade.createMany({
      data: [
        {
          analystId: analystA.id,
          instrument: "NIFTY 22500 CE",
          segment: "Index Options",
          tradeType: "BUY",
          entryPrice: 142.5,
          stopLoss: 108.0,
          target1: 178.0,
          target2: 205.0,
          target3: 240.0,
          riskRating: 3,
          status: "ACTIVE",
          rationale:
            "Index holding above the 22400 demand zone with supportive options data. Risk-defined long with a clear invalidation.",
          isTrialVisible: true,
          postedAt: daysFromNow(-1)
        },
        {
          analystId: analystB.id,
          instrument: "TATAMOTORS",
          segment: "Equity Cash",
          tradeType: "BUY",
          entryPrice: 968.0,
          stopLoss: 932.0,
          target1: 1010.0,
          target2: 1048.0,
          riskRating: 2,
          status: "ACTIVE",
          rationale:
            "Breakout-retest on the daily chart with rising delivery volumes. Positional swing setup.",
          isTrialVisible: false,
          postedAt: daysFromNow(-2)
        },
        {
          analystId: analystA.id,
          instrument: "BANKNIFTY 48000 PE",
          segment: "Index Options",
          tradeType: "BUY",
          entryPrice: 210.0,
          stopLoss: 165.0,
          target1: 260.0,
          target2: 305.0,
          riskRating: 4,
          status: "TARGET2_HIT",
          rationale: "Bearish rejection at supply with weak banking sector breadth.",
          isTrialVisible: true,
          postedAt: daysFromNow(-9),
          closedAt: daysFromNow(-7)
        },
        {
          analystId: analystB.id,
          instrument: "INFY",
          segment: "Equity Cash",
          tradeType: "SELL",
          entryPrice: 1525.0,
          stopLoss: 1562.0,
          target1: 1480.0,
          target2: 1448.0,
          riskRating: 3,
          status: "STOP_LOSS_HIT",
          rationale: "Lower-high formation expected to fail; stop placed above the swing pivot.",
          isTrialVisible: false,
          postedAt: daysFromNow(-12),
          closedAt: daysFromNow(-10)
        },
        {
          analystId: analystA.id,
          instrument: "RELIANCE",
          segment: "Equity Cash",
          tradeType: "BUY",
          entryPrice: 2840.0,
          stopLoss: 2788.0,
          target1: 2910.0,
          target2: 2965.0,
          riskRating: 2,
          status: "TARGET1_HIT",
          rationale: "Trend continuation from a tight consolidation near all-time highs.",
          isTrialVisible: true,
          postedAt: daysFromNow(-15),
          closedAt: daysFromNow(-13)
        }
      ]
    });
  }

  // --- Market outlooks ---------------------------------------------------
  const existingOutlooks = await prisma.marketOutlook.count();
  if (existingOutlooks === 0) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setUTCDate(today.getUTCDate() - 1);

    await prisma.marketOutlook.create({
      data: {
        analystId: analystA.id,
        date: today,
        nifty: "Constructive above 22400; momentum favours dips being bought.",
        bankNifty: "Range-bound between 47800 and 48600 until a decisive breakout.",
        volatility: "India VIX near 13 - a calm, trend-friendly environment.",
        globalCues: "Mildly positive; US indices closed higher, Asian markets steady.",
        sectorStrength: "Auto and capital goods leading; IT remains a relative laggard.",
        institutionalSentiment: "FIIs marginal net buyers, DIIs continue steady absorption."
      }
    });
    await prisma.marketOutlook.create({
      data: {
        analystId: analystB.id,
        date: yesterday,
        nifty: "Held the 22400 support; intraday range was narrow.",
        bankNifty: "Quiet session, closed near the middle of its range.",
        volatility: "India VIX flat - no event-driven stress in pricing.",
        globalCues: "Neutral; markets awaited overnight US data.",
        sectorStrength: "FMCG defensive bid; metals consolidated.",
        institutionalSentiment: "Balanced flows from both FIIs and DIIs."
      }
    });
  }

  // --- Subscription for the demo member ---------------------------------
  const memberSub = await prisma.subscription.findFirst({ where: { userId: member.id } });
  if (!memberSub) {
    await prisma.subscription.create({
      data: {
        userId: member.id,
        planType: "MONTHLY",
        planCode: "MONTHLY",
        planName: "Monthly Membership",
        status: "ACTIVE",
        amountPaise: 249900,
        startDate: daysFromNow(-5),
        endDate: daysFromNow(25)
      }
    });
  }

  // --- Legal content (ManagedContent overrides) -------------------------
  for (const slug of LEGAL_SLUGS) {
    const doc = LEGAL_DOCS[slug];
    await prisma.managedContent.upsert({
      where: { slug: `legal:${slug}` },
      update: { title: doc.title, body: doc.body },
      create: { slug: `legal:${slug}`, title: doc.title, body: doc.body }
    });
  }

  // --- Notifications for the demo member --------------------------------
  const existingNotifications = await prisma.notification.count({ where: { userId: member.id } });
  if (existingNotifications === 0) {
    await prisma.notification.createMany({
      data: [
        {
          userId: member.id,
          title: "Welcome to Wealth Research Desk",
          body: "Your membership is active. Explore today's trades and market outlook.",
          channel: "DASHBOARD",
          eventType: "WELCOME"
        },
        {
          userId: member.id,
          title: "New trade published: NIFTY 22500 CE",
          body: "A new risk-defined long setup is live on your dashboard.",
          channel: "DASHBOARD",
          eventType: "TRADE_PUBLISHED"
        },
        {
          userId: member.id,
          title: "Target achieved: RELIANCE",
          body: "The RELIANCE long reached Target 1. See trade history for details.",
          channel: "DASHBOARD",
          eventType: "TRADE_UPDATE",
          isRead: true,
          readAt: daysFromNow(-12)
        }
      ]
    });
  }

  console.log("Seed complete.");
  console.log("  Admin  : admin@wealthdesk.in  / Admin@12345");
  console.log("  Member : member@wealthdesk.in / Member@12345");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
