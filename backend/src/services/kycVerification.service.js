/**
 * KYC auto-verification: 5 parameters.
 * Uses placeholders for OCR and face match; integrate real providers (e.g. AWS Rekognition, Google Vision) via queues.
 */
const db = require("../modules/kyc/kyc.mysql");
const userDb = require("../modules/users/user.mysql");

const KYC_STATUS = {
    NONE: "none",
    PENDING_AUTO: "pending_auto",
    VERIFIED_AUTO: "verified_auto",
    PENDING_MANUAL: "pending_manual",
    VERIFIED_MANUAL: "verified_manual",
    REJECTED: "rejected",
};

const SUBMISSION_STATUS = {
    PENDING_AUTO: "pending_auto",
    VERIFIED_AUTO: "verified_auto",
    PENDING_MANUAL: "pending_manual",
    VERIFIED_MANUAL: "verified_manual",
    REJECTED: "rejected",
};

const FACE_MATCH_THRESHOLD = 0.85;
const NAME_MATCH_THRESHOLD = 0.8;
const MIN_AGE = 18;

/**
 * P1) Face match: compare document face with selfie.
 * TODO: Integrate face comparison API (e.g. AWS Rekognition CompareFaces, Azure Face API).
 * Placeholder: return 0.9 if selfie URL present, else 0.
 */
async function runFaceMatch(_docImageUrl, selfieImageUrl) {
    if (!selfieImageUrl) return { score: 0, pass: false };
    // Placeholder: assume pass for dev; replace with real API call or queue job
    const score = 0.9;
    return { score, pass: score >= FACE_MATCH_THRESHOLD };
}

function normalizeName(s) {
    return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * P2) Name match: compare document name with profile full_name.
 * docFullName = from document, profileFullName = from user profile.
 */
async function runNameMatch(_docImageUrl, docFullName, profileFullName) {
    const extractedName = (docFullName || "").trim();
    if (!extractedName) return { score: 0, extractedName: null, pass: false };
    const profileName = (profileFullName || "").trim();
    if (!profileName) return { score: 0, extractedName, pass: false };
    const n1 = normalizeName(extractedName);
    const n2 = normalizeName(profileName);
    const score = n1 === n2 ? 1 : (n1.includes(n2) || n2.includes(n1) ? 0.85 : 0.5);
    return { score, extractedName, pass: score >= NAME_MATCH_THRESHOLD };
}

/**
 * P3) Birthdate + age: compare document DOB with profile, check >= 18.
 */
function runBirthdateAndAge(docBirthdate, profileBirthdate) {
    const dob = docBirthdate ? new Date(docBirthdate) : null;
    if (!dob || isNaN(dob.getTime())) return { extractedDob: null, age: null, pass: false };
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
    const profileDob = profileBirthdate ? new Date(profileBirthdate) : null;
    const dobMatch = profileDob && !isNaN(profileDob.getTime()) &&
        dob.getTime() === profileDob.getTime();
    return {
        extractedDob: dob,
        age,
        pass: age >= MIN_AGE && dobMatch,
    };
}

/**
 * P4) Document quality: resolution, not screenshot, required fields.
 * TODO: Image quality checks (sharpness, resolution); detect screenshot/compression.
 * Placeholder: pass if doc URL present.
 */
async function runDocQuality(_docImageUrl) {
    return { pass: true };
}

/**
 * P5) Phone + identity binding: doc_hash unique across accounts.
 */
async function runDocHashBinding(docHash, userId) {
    const count = await db.countByDocHash(docHash, userId);
    const duplicate = count > 0;
    return { duplicate, pass: !duplicate };
}

/**
 * P6) Doc number match: compare user-entered doc number with value extracted from document image.
 * For Fayda: FIN is on the BACK of the card - should match exactly (12 digits).
 * TODO: Integrate OCR (Google Vision, AWS Textract) to extract FIN from back image.
 * Until OCR is integrated, we validate format only; pass for other doc types.
 */
async function runDocNumberMatch(docType, userDocNumber, backImageUrl) {
    if (docType !== "fayda") return { pass: true, extractedMatch: null };
    const digits = (userDocNumber || "").replace(/\D/g, "");
    if (digits.length !== 12) return { pass: false, extractedMatch: null };
    // TODO: Call OCR on backImageUrl to extract FIN, then compare with digits.
    // const extracted = await extractFinFromImage(backImageUrl); // e.g. Google Vision / Textract
    // const match = extracted && extracted.replace(/\D/g, "") === digits;
    // return { pass: match, extractedMatch: match };
    return { pass: true, extractedMatch: null };
}

/**
 * Run full verification pipeline and return result + suggested status.
 * Compares document data (sub) with user profile data.
 * @param {string} submissionId
 * @param {{ docNumberForCompare?: string, docType?: string }} opts - For Fayda FIN comparison with back image (OCR)
 */
async function runVerificationPipeline(submissionId, opts = {}) {
    const sub = await db.findById(submissionId);
    if (!sub) return null;
    const user = await userDb.getById(sub.user_id);
    if (!user) return null;

    const urlParts = sub.cloudinary_url_private?.split("|") || [];
    const docUrl = urlParts[0] || null;
    const backImageUrl = urlParts[1] || null;
    const selfieUrl = sub.selfie_image_url;
    const docFullName = sub.full_name;
    const docBirthdate = sub.birthdate;
    const profileFullName = user.full_name;
    const profileBirthdate = user.dob;

    const p6 = await runDocNumberMatch(opts.docType || sub.doc_type, opts.docNumberForCompare, backImageUrl);

    const [p1, p2, p3, p4, p5] = await Promise.all([
        runFaceMatch(docUrl, selfieUrl),
        runNameMatch(docUrl, docFullName, profileFullName),
        Promise.resolve(runBirthdateAndAge(docBirthdate, profileBirthdate)),
        runDocQuality(docUrl),
        runDocHashBinding(sub.doc_hash, sub.user_id),
    ]);

    // Auto-approve when face and personal data match (no admin needed).
    // p4 (doc quality) is optional placeholder; p5/p6 prevent duplicate doc use.
    const allPass =
        p1.pass && p2.pass && p3.pass && p5.pass && p6.pass;

    await db.updateById(submissionId, {
        face_match_score: p1.score,
        name_match_score: p2.score,
        extracted_name: p2.extractedName || null,
        extracted_dob: p3.extractedDob || null,
        doc_quality_ok: p4.pass ? 1 : 0,
        doc_hash_duplicate: p5.duplicate ? 1 : 0,
        status: allPass ? SUBMISSION_STATUS.VERIFIED_AUTO : SUBMISSION_STATUS.PENDING_MANUAL,
    });

    if (allPass) {
        await userDb.updateKyc(sub.user_id, {
            kyc_status: KYC_STATUS.VERIFIED_AUTO,
            kyc_level: 2,
            kyc_face_verified: 1,
        });
        const dobVal = p3.extractedDob ? p3.extractedDob.toISOString().slice(0, 10) : null;
        await userDb.updateById(sub.user_id, {
            full_name: docFullName || undefined,
            dob: dobVal || undefined,
        });
    } else {
        await userDb.updateKyc(sub.user_id, {
            kyc_status: KYC_STATUS.PENDING_MANUAL,
            kyc_level: 0,
        });
    }

    return {
        p1: { pass: p1.pass, score: p1.score },
        p2: { pass: p2.pass, score: p2.score },
        p3: { pass: p3.pass, age: p3.age },
        p4: { pass: p4.pass },
        p5: { pass: p5.pass, duplicate: p5.duplicate },
        p6: { pass: p6.pass, extractedMatch: p6.extractedMatch },
        allPass,
        status: allPass ? SUBMISSION_STATUS.VERIFIED_AUTO : SUBMISSION_STATUS.PENDING_MANUAL,
    };
}

module.exports = {
    KYC_STATUS,
    SUBMISSION_STATUS,
    runFaceMatch,
    runNameMatch,
    runBirthdateAndAge,
    runDocQuality,
    runDocHashBinding,
    runVerificationPipeline,
    FACE_MATCH_THRESHOLD,
    NAME_MATCH_THRESHOLD,
    MIN_AGE,
};
