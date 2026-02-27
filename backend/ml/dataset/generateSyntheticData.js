/**
 * Synthetic data generator for scam detection.
 * Generates scam/legit job posts and marketplace listings.
 * Target: 5000+ samples.
 */
const fs = require("fs");
const path = require("path");

const OUTPUT = path.join(__dirname, "..", "data", "synthetic.json");

const SCAM_JOB_TEMPLATES = [
    { title: "Earn {salary} per week! Work from home", desc: "Send your CV and passport copy to apply. Deposit {amount} required for training materials. Contact on WhatsApp {phone}.", tags: ["deposit", "passport", "whatsapp"] },
    { title: "High paying remote job - {salary}/month", desc: "Pay upfront {amount} for software license. Wire transfer or crypto accepted. DM for details.", tags: ["upfront", "wire", "crypto"] },
    { title: "Easy money - {salary} weekly guaranteed", desc: "Deposit {amount} to start. Western Union or MoneyGram. Contact me on Telegram.", tags: ["deposit", "western union", "telegram"] },
    { title: "Urgent: Data entry clerk {salary}", desc: "Send passport and ID. Pay {amount} for background check. Hurry limited spots!", tags: ["passport", "upfront", "urgent"] },
    { title: "Get rich - {salary} in 2 weeks", desc: "Crypto payment only. Invest {amount} first. Act now!", tags: ["crypto", "upfront", "too good"] },
    { title: "Work from home - {salary}/day", desc: "Contact WhatsApp {phone}. Pay {amount} deposit to secure position. Passport required.", tags: ["whatsapp", "deposit", "passport"] },
    { title: "Amazing salary {salary} - apply now", desc: "Send money via Western Union for equipment. Email me your passport.", tags: ["western union", "passport"] },
    { title: "Earn {salary} monthly - no experience", desc: "Bitcoin or USDT payment for onboarding. Hurry!", tags: ["crypto", "too good"] },
    { title: "Admin assistant {salary}", desc: "Contact me on Signal. Advance payment of {amount} for materials.", tags: ["off-platform", "upfront"] },
    { title: "Limited time: {salary}/week job", desc: "Deposit required. Bank transfer. Don't miss out!", tags: ["deposit", "wire"] },
];

const LEGIT_JOB_TEMPLATES = [
    { title: "Software Engineer - {company}", desc: "Full-time role in {location}. Requirements: 2+ years experience. Apply through our website.", tags: [] },
    { title: "Marketing Coordinator at {company}", desc: "Based in {location}. Competitive salary. Send resume to hr@company.com", tags: [] },
    { title: "Customer Support Representative", desc: "Join {company} in {location}. Benefits included. No fees to apply.", tags: [] },
    { title: "Sales Associate - {location}", desc: "Part-time position. Paid training. Apply in person or online.", tags: [] },
    { title: "Data Analyst - {company}", desc: "Remote work possible. Standard hiring process. Contact HR for details.", tags: [] },
    { title: "Warehouse Worker - {location}", desc: "Full-time. Overtime available. Apply at our office.", tags: [] },
    { title: "Teacher - {location} School", desc: "Certification required. Benefits package. Official application process.", tags: [] },
    { title: "Nurse - {company} Hospital", desc: "Licensed RN. Located in {location}. Apply through careers page.", tags: [] },
];

const SCAM_MARKET_TEMPLATES = [
    { title: "iPhone 15 Pro - {price}", desc: "Contact WhatsApp only. Pay half upfront. Shipping after payment. Crypto OK.", tags: ["whatsapp", "upfront", "crypto"] },
    { title: "MacBook Pro - great deal {price}", desc: "Wire transfer only. Send {amount} deposit. Hurry before sold!", tags: ["wire", "deposit", "urgent"] },
    { title: "Gaming laptop {price}", desc: "PayPal gift or crypto. Contact Telegram. No returns.", tags: ["crypto", "telegram"] },
    { title: "Car for sale - {price}", desc: "Western Union payment. Send passport for paperwork. Serious buyers only.", tags: ["western union", "passport"] },
    { title: "Apartment rent - {price}/month", desc: "Deposit required before viewing. Contact on Signal. Act fast!", tags: ["deposit", "off-platform"] },
];

const LEGIT_MARKET_TEMPLATES = [
    { title: "Used furniture - {price}", desc: "Pickup in {location}. Cash on pickup. Good condition.", tags: [] },
    { title: "Bicycle for sale {price}", desc: "Located in {location}. Test ride welcome. No delivery.", tags: [] },
    { title: "Books - various titles", desc: "Pickup only. Cash or bank transfer. {location}", tags: [] },
    { title: "Baby stroller - {price}", desc: "Used, good condition. Meet in {location}.", tags: [] },
];

const LOCATIONS = ["Dubai", "Abu Dhabi", "Riyadh", "Cairo", "Addis Ababa", "Nairobi", "London", "New York", "Singapore", "Lagos", "Accra"];
const COMPANIES = ["TechCorp", "Global Services", "Prime Solutions", "Innovate Ltd", "Delta Corp", "Alpha Inc"];
const SALARIES = ["5000", "8000", "12000", "15000", "20000", "25000", "50000", "100000"];
const AMOUNTS = ["100", "200", "500", "1000", "1500", "2000"];
const PRICES = ["500", "1200", "2500", "5000", "12000", "25000"];
const PHONES = ["+971501234567", "+251911234567", "+966501234567", "+201012345678"];

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateScamJob() {
    const t = pick(SCAM_JOB_TEMPLATES);
    const text = `${t.title.replace("{salary}", pick(SALARIES)).replace("{amount}", pick(AMOUNTS)).replace("{phone}", pick(PHONES))} ${t.desc.replace("{salary}", pick(SALARIES)).replace("{amount}", pick(AMOUNTS)).replace("{phone}", pick(PHONES))} ${pick(LOCATIONS)}`;
    return { text: text.replace(/\s+/g, " ").trim(), label: "SCAM", source: "synthetic_job", type: "job" };
}

function generateLegitJob() {
    const t = pick(LEGIT_JOB_TEMPLATES);
    const text = `${t.title.replace("{company}", pick(COMPANIES)).replace("{location}", pick(LOCATIONS))} ${t.desc.replace("{company}", pick(COMPANIES)).replace("{location}", pick(LOCATIONS))}`;
    return { text: text.replace(/\s+/g, " ").trim(), label: "LEGIT", source: "synthetic_job", type: "job" };
}

function generateScamMarket() {
    const t = pick(SCAM_MARKET_TEMPLATES);
    const text = `${t.title.replace("{price}", pick(PRICES)).replace("{amount}", pick(AMOUNTS))} ${t.desc.replace("{price}", pick(PRICES)).replace("{amount}", pick(AMOUNTS))} ${pick(LOCATIONS)}`;
    return { text: text.replace(/\s+/g, " ").trim(), label: "SCAM", source: "synthetic_market", type: "marketplace" };
}

function generateLegitMarket() {
    const t = pick(LEGIT_MARKET_TEMPLATES);
    const text = `${t.title.replace("{price}", pick(PRICES))} ${t.desc.replace("{location}", pick(LOCATIONS)).replace("{price}", pick(PRICES))}`;
    return { text: text.replace(/\s+/g, " ").trim(), label: "LEGIT", source: "synthetic_market", type: "marketplace" };
}

function addVariation(sample) {
    const variants = [
        (s) => s,
        (s) => s.replace(/\s+/g, "  ").trim().replace(/\s{2,}/g, " "),
        (s) => s.toLowerCase(),
        (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(),
    ];
    return pick(variants)(sample.text);
}

function run(count = 5500) {
    const samples = [];
    const half = Math.floor(count / 2);
    const jobCount = Math.floor(count * 0.6);
    const marketCount = count - jobCount;

    const scamJobs = Math.floor(jobCount * 0.5);
    const legitJobs = jobCount - scamJobs;
    const scamMarkets = Math.floor(marketCount * 0.5);
    const legitMarkets = marketCount - scamMarkets;

    for (let i = 0; i < scamJobs; i++) {
        const s = generateScamJob();
        samples.push({ ...s, text: addVariation(s) || s.text });
    }
    for (let i = 0; i < legitJobs; i++) {
        const s = generateLegitJob();
        samples.push({ ...s, text: addVariation(s) || s.text });
    }
    for (let i = 0; i < scamMarkets; i++) {
        const s = generateScamMarket();
        samples.push({ ...s, text: addVariation(s) || s.text });
    }
    for (let i = 0; i < legitMarkets; i++) {
        const s = generateLegitMarket();
        samples.push({ ...s, text: addVariation(s) || s.text });
    }

    for (const s of samples) {
        if (!s.text) s.text = s.label === "SCAM" ? generateScamJob().text : generateLegitJob().text;
    }

    const dir = path.dirname(OUTPUT);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(OUTPUT, JSON.stringify(samples, null, 2), "utf8");
    console.log(`Generated ${samples.length} synthetic samples -> ${OUTPUT}`);
    return samples;
}

if (require.main === module) {
    run(parseInt(process.argv[2], 10) || 5500);
}

module.exports = { run, generateScamJob, generateLegitJob, generateScamMarket, generateLegitMarket };
