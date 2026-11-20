// Tiny file-based database (no MongoDB needed).
// Data is saved as JSON inside the "data" folder next to this file.
// It supports the same functions the routes already use:
// find, findOne, findById, create, findByIdAndUpdate, findByIdAndDelete,
// .populate(), .select(), and doc.save()

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const registry = {};

const newId = () => crypto.randomBytes(12).toString('hex');
const isMissing = (v) => v === undefined || v === null || v === '';

function castValue(def, value, key) {
    if (value === undefined || value === null) return value;
    if (def.type === Number) {
        const n = Number(value);
        if (Number.isNaN(n)) throw new Error(`${key} must be a number`);
        return n;
    }
    if (def.type === Date) {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) throw new Error(`${key} must be a valid date`);
        return d.toISOString();
    }
    if (def.type === 'Id') {
        if (typeof value === 'object' && value._id) return String(value._id);
        return String(value);
    }
    return String(value);
}

function model(name, schema) {
    const file = path.join(DATA_DIR, name.toLowerCase() + 's.db');
    let rows = [];
    if (fs.existsSync(file)) {
        rows = JSON.parse(fs.readFileSync(file, 'utf8') || '[]');
    }

    const persist = () => fs.writeFileSync(file, JSON.stringify(rows, null, 2));

    const wrap = (row) => {
        if (!row) return null;
        const doc = { ...row };
        Object.defineProperty(doc, 'save', {
            enumerable: false,
            value: async () => {
                const idx = rows.findIndex((r) => r._id === doc._id);
                if (idx === -1) throw new Error('Document no longer exists');
                const updated = { ...rows[idx] };
                for (const key of Object.keys(schema)) {
                    if (doc[key] !== undefined) updated[key] = castValue(schema[key], doc[key], key);
                }
                updated.updatedAt = new Date().toISOString();
                rows[idx] = updated;
                persist();
                Object.assign(doc, updated);
                return doc;
            }
        });
        return doc;
    };

    const matches = (row, filter) =>
        Object.keys(filter).every(
            (k) => filter[k] !== undefined && row[k] !== undefined && String(row[k]) === String(filter[k])
        );

    const getModel = (ref) => {
        if (!registry[ref]) require('./models/' + ref.toLowerCase());
        return registry[ref];
    };

    class Query {
        constructor(exec) {
            this._exec = exec;
            this._populate = [];
            this._select = null;
        }
        populate(field, select) {
            this._populate.push([field, select]);
            return this;
        }
        select(spec) {
            this._select = spec;
            return this;
        }
        async run() {
            const result = await this._exec();
            const list = Array.isArray(result) ? result : result ? [result] : [];
            for (const doc of list) {
                for (const [field, select] of this._populate) {
                    const ref = schema[field] && schema[field].ref;
                    const raw = ref ? getModel(ref)._raw(doc[field]) : null;
                    if (!raw) { doc[field] = null; continue; }
                    if (select) {
                        const keep = select.split(/\s+/).filter(Boolean);
                        const picked = { _id: raw._id };
                        keep.forEach((k) => { picked[k] = raw[k]; });
                        doc[field] = picked;
                    } else {
                        doc[field] = { ...raw };
                    }
                }
                if (this._select) {
                    const parts = this._select.split(/\s+/).filter(Boolean);
                    const hide = parts.filter((p) => p.startsWith('-')).map((p) => p.slice(1));
                    hide.forEach((k) => { delete doc[k]; });
                }
            }
            return result;
        }
        then(resolve, reject) { return this.run().then(resolve, reject); }
        catch(reject) { return this.run().catch(reject); }
    }

    const Model = {
        _raw: (id) => rows.find((r) => r._id === String(id && id._id ? id._id : id)) || null,

        find: (filter = {}) =>
            new Query(async () => rows.filter((r) => matches(r, filter)).map(wrap)),

        findOne: (filter = {}) =>
            new Query(async () => wrap(rows.find((r) => matches(r, filter)))),

        findById: (id) =>
            new Query(async () => wrap(rows.find((r) => r._id === String(id)))),

        create: async (data) => {
            const row = { _id: newId() };
            for (const [key, def] of Object.entries(schema)) {
                let value = data[key];
                if (value === undefined && def.default !== undefined) {
                    value = typeof def.default === 'function' ? def.default() : def.default;
                }
                if (def.required && isMissing(value)) {
                    throw new Error(`${name} validation failed: ${key} is required`);
                }
                value = castValue(def, value, key);
                if (def.enum && value !== undefined && !def.enum.includes(value)) {
                    throw new Error(`${name} validation failed: ${key} must be one of ${def.enum.join(', ')}`);
                }
                if (def.unique && value !== undefined && rows.some((r) => r[key] === value)) {
                    throw new Error(`${name} validation failed: ${key} already exists`);
                }
                if (value !== undefined) row[key] = value;
            }
            row.createdAt = new Date().toISOString();
            row.updatedAt = row.createdAt;
            rows.push(row);
            persist();
            return wrap(row);
        },

        findByIdAndUpdate: (id, update = {}, options = {}) =>
            new Query(async () => {
                const idx = rows.findIndex((r) => r._id === String(id));
                if (idx === -1) return null;
                const before = { ...rows[idx] };
                const updated = { ...rows[idx] };
                for (const [key, def] of Object.entries(schema)) {
                    if (update[key] !== undefined) updated[key] = castValue(def, update[key], key);
                }
                updated.updatedAt = new Date().toISOString();
                rows[idx] = updated;
                persist();
                return wrap(options.new ? updated : before);
            }),

        findByIdAndDelete: (id) =>
            new Query(async () => {
                const idx = rows.findIndex((r) => r._id === String(id));
                if (idx === -1) return null;
                const [removed] = rows.splice(idx, 1);
                persist();
                return wrap(removed);
            })
    };

    registry[name] = Model;
    return Model;
}

module.exports = { model };