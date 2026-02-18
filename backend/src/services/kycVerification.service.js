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

/**
 * P2) Name match: OCR extract name from doc, fuzzy compare with profile full_name.
 * TODO: Integrate OCR (e.g. Google Vision, AWS Textract) and fuzzy match.
 * Placeholder: return 0.9 if user provided full_name.
 */
async function runNameMatch(_docImageUrl, profileFullName) {
    const extractedName = (profileFullName || "").trim();
    if (!extractedName) return { score: 0, extractedName: null, pass: false };
    // Placeholder: no OCR; use profile name as "extracted" for comparison
    const score = 0.95;
    return { score, extractedName, pass: score >= NAME_MATCH_THRESHOLD };
}

/**
 * P3) Birthdate + age: OCR extract DOB, compare with profile birthdate, check >= 18.
 * TODO: OCR extract DOB from document.
 * Placeholder: use profile birthdate only; check age.
 */
function runBirthdateAndAge(profileBirthdate) {
    const dob = profileBirthdate ? new Date(profileBirthdate) : null;
    if (!dob || isNaN(dob.getTime())) return { extractedDob: null, age: null, pass: false };
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
    return {
        extractedDob: dob,
        age,
        pass: age >= MIN_AGE,
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
 * Run full verification pipeline and return result + suggested status.
 */
async function runVerificationPipeline(submissionId) {
    const sub = await db.findById(submissionId);
    if (!sub) return null;

    const docUrl = sub.cloudinary_url_private?.split("|")[0] || null;
    const selfieUrl = sub.selfie_image_url;
    const profileFullName = sub.full_name;
    const profileBirthdate = sub.birthdate;

    const [p1, p2, p3, p4, p5] = await Promise.all([
        runFaceMatch(docUrl, selfieUrl),
        runNameMatch(docUrl, profileFullName),
        Promise.resolve(runBirthdateAndAge(profileBirthdate)),
        runDocQuality(docUrl),
        runDocHashBinding(sub.doc_hash, sub.user_id),
    ]);

    const allPass =
        p1.pass && p2.pass && p3.pass && p4.pass && p5.pass;

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
            full_name: profileFullName || undefined,
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
