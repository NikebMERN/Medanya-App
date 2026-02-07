// src/modules/marketplace/market.service.js
const db = require("./market.mysql");

function codeErr(code, message) {
    const e = new Error(message || code);
    e.code = code;
    return e;
}

function isAdmin(user) {
    return user?.role === "admin";
}

function cleanStr(v, max = 2000) {
    const s = String(v || "").trim();
    if (!s) return "";
    return s.length > max ? s.slice(0, max) : s;
}

function parsePrice(v) {
    // Allow "1200", "1200.50", reject negative, NaN
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return null;
    // keep 2 decimals
    return Math.round(n * 100) / 100;
}

function validateCreate(body) {
    const title = cleanStr(body.title, 120);
    const description = cleanStr(body.description, 2000);
    const category = cleanStr(body.category, 60);
    const location = cleanStr(body.location, 120);
    const price = parsePrice(body.price);

    const image_urls = Array.isArray(body.image_urls)
        ? body.image_urls
            .map((u) => cleanStr(u, 600))
            .filter(Boolean)
            .slice(0, 8)
        : [];

    if (!title) throw codeErr("VALIDATION_ERROR", "title is required");
    if (!description)
        throw codeErr("VALIDATION_ERROR", "description is required");
    if (!category) throw codeErr("VALIDATION_ERROR", "category is required");
    if (!location) throw codeErr("VALIDATION_ERROR", "location is required");
    if (price === null)
        throw codeErr("VALIDATION_ERROR", "price must be a valid number");

    return { title, description, category, location, price, image_urls };
}

function validateUpdate(body) {
    const out = {};
    if (body.title !== undefined) out.title = cleanStr(body.title, 120);
    if (body.description !== undefined)
        out.description = cleanStr(body.description, 2000);
    if (body.category !== undefined) out.category = cleanStr(body.category, 60);
    if (body.location !== undefined) out.location = cleanStr(body.location, 120);

    if (body.price !== undefined) {
        const p = parsePrice(body.price);
        if (p === null)
            throw codeErr("VALIDATION_ERROR", "price must be a valid number");
        out.price = p;
    }

    if (body.image_urls !== undefined) {
        out.image_urls = Array.isArray(body.image_urls)
            ? body.image_urls
                .map((u) => cleanStr(u, 600))
                .filter(Boolean)
                .slice(0, 8)
            : [];
    }

    if (body.status !== undefined) {
        const s = cleanStr(body.status, 20);
        if (!["active", "sold", "removed"].includes(s))
            throw codeErr("VALIDATION_ERROR", "invalid status");
        out.status = s;
    }

    // Validate required fields if present
    if (out.title !== undefined && !out.title)
        throw codeErr("VALIDATION_ERROR", "invalid title");
    if (out.description !== undefined && !out.description)
        throw codeErr("VALIDATION_ERROR", "invalid description");
    if (out.category !== undefined && !out.category)
        throw codeErr("VALIDATION_ERROR", "invalid category");
    if (out.location !== undefined && !out.location)
        throw codeErr("VALIDATION_ERROR", "invalid location");

    return out;
}

async function create(user, body) {
    const seller_id = user?.id ?? user?.userId;
    if (!seller_id) throw codeErr("UNAUTHORIZED", "Auth required");

    const data = validateCreate(body);
    const id = await db.insertItem({ seller_id, ...data });
    return db.findById(id);
}

async function list(query) {
    return db.listItems(query);
}

async function detail(id) {
    const item = await db.findById(id);
    if (!item) throw codeErr("NOT_FOUND", "Item not found");
    return item;
}

async function update(user, id, body) {
    const userId = user?.id ?? user?.userId;
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");

    const item = await db.findById(id);
    if (!item) throw codeErr("NOT_FOUND", "Item not found");

    if (!isAdmin(user) && String(item.seller_id) !== String(userId)) {
        throw codeErr("FORBIDDEN", "Not allowed");
    }

    const fields = validateUpdate(body);
    await db.updateItem(id, fields);
    return db.findById(id);
}

async function markSold(user, id) {
    const userId = user?.id ?? user?.userId;
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");

    const item = await db.findById(id);
    if (!item) throw codeErr("NOT_FOUND", "Item not found");

    if (!isAdmin(user) && String(item.seller_id) !== String(userId)) {
        throw codeErr("FORBIDDEN", "Not allowed");
    }

    await db.markSold(id);
    return db.findById(id);
}

async function remove(user, id) {
    const userId = user?.id ?? user?.userId;
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");

    const item = await db.findById(id);
    if (!item) throw codeErr("NOT_FOUND", "Item not found");

    if (!isAdmin(user) && String(item.seller_id) !== String(userId)) {
        throw codeErr("FORBIDDEN", "Not allowed");
    }

    await db.softRemove(id);
    return true;
}

async function search(query) {
    return db.searchItems(query);
}

async function addFavorite(user, itemId) {
    const userId = user?.id ?? user?.userId;
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");
    const item = await db.findById(itemId);
    if (!item) throw codeErr("NOT_FOUND", "Item not found");
    const added = await db.addFavorite(userId, itemId);
    return { favorited: true, added };
}

async function removeFavorite(user, itemId) {
    const userId = user?.id ?? user?.userId;
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");
    await db.removeFavorite(userId, itemId);
    return { favorited: false };
}

async function listFavorites(user, query) {
    const userId = user?.id ?? user?.userId;
    if (!userId) throw codeErr("UNAUTHORIZED", "Auth required");
    const itemIds = await db.listFavoriteItemIdsByUserId(userId);
    if (itemIds.length === 0) return { page: 1, limit: 20, total: 0, items: [] };
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 50);
    const offset = (page - 1) * limit;
    const paginatedIds = itemIds.slice(offset, offset + limit);
    const items = [];
    for (const id of paginatedIds) {
        const item = await db.findById(id);
        if (item) items.push({ ...item, isFavorited: true });
    }
    return { page, limit, total: itemIds.length, items };
}

async function detailWithFavorite(user, id) {
    const item = await detail(id);
    if (user?.id || user?.userId) {
        item.isFavorited = await db.isFavorite(user.id ?? user.userId, id);
    } else {
        item.isFavorited = false;
    }
    return item;
}

module.exports = {
    create,
    list,
    detail,
    detailWithFavorite,
    update,
    markSold,
    remove,
    search,
    addFavorite,
    removeFavorite,
    listFavorites,
};
