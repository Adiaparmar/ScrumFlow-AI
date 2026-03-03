import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DB_PATH = path.join(process.cwd(), 'data', 'organizations.json');

interface Organization {
    id: string;
    name: string;
    email: string;
    password_hash: string; // format: "<hex-hash>:<hex-salt>"
    created_at: string;
}

function readOrgs(): Organization[] {
    if (!fs.existsSync(DB_PATH)) return [];
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    try { return JSON.parse(raw); } catch { return []; }
}

function writeOrgs(orgs: Organization[]) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(orgs, null, 2), 'utf-8');
}

/** Hash a plaintext password with a random salt using scrypt. */
function hashPassword(plaintext: string): string {
    const salt = crypto.randomBytes(16).toString('hex');       // 32-char hex salt
    const hash = crypto.scryptSync(plaintext, salt, 64).toString('hex'); // 128-char hex hash
    return `${hash}:${salt}`;
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
        return NextResponse.json(
            { error: 'name, email, and password are required.' },
            { status: 400 }
        );
    }

    const orgs = readOrgs();

    const existing = orgs.find((o) => o.email === email.trim().toLowerCase());
    if (existing) {
        return NextResponse.json(
            { error: 'An organisation with this email already exists.' },
            { status: 409 }
        );
    }

    const newOrg: Organization = {
        id: crypto.randomUUID(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password_hash: hashPassword(password),
        created_at: new Date().toISOString(),
    };

    orgs.push(newOrg);
    writeOrgs(orgs);

    // Return org without sensitive fields
    const { password_hash: _ph, ...safeOrg } = newOrg;
    return NextResponse.json({ success: true, organization: safeOrg }, { status: 201 });
}
