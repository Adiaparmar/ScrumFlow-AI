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

/**
 * Verify a plaintext password against a stored "hash:salt" string.
 * Uses timingSafeEqual to prevent timing attacks.
 */
function verifyPassword(plaintext: string, stored: string): boolean {
    const [storedHash, salt] = stored.split(':');
    if (!storedHash || !salt) return false;
    const incoming = crypto.scryptSync(plaintext, salt, 64);
    const expected = Buffer.from(storedHash, 'hex');
    // Both buffers must be same length for timingSafeEqual
    if (incoming.length !== expected.length) return false;
    return crypto.timingSafeEqual(incoming, expected);
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
        return NextResponse.json(
            { error: 'email and password are required.' },
            { status: 400 }
        );
    }

    const orgs = readOrgs();
    const org = orgs.find((o) => o.email === email.trim().toLowerCase());

    if (!org || !verifyPassword(password, org.password_hash)) {
        // Same error for both "not found" and "wrong password" — avoid user enumeration
        return NextResponse.json(
            { error: 'Invalid email or password.' },
            { status: 401 }
        );
    }

    const { password_hash: _ph, ...safeOrg } = org;
    return NextResponse.json({ success: true, organization: safeOrg }, { status: 200 });
}
