import { pgPool } from "../database";

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  notes: string | null;
  created_at: Date;
}

/**
 * Create a new contact (person of interest) for a user.
 */
export async function createContact(
  userId: string,
  name: string,
  email?: string,
  notes?: string
): Promise<Contact> {
  const result = await pgPool.query<Contact>(
    `INSERT INTO contacts (user_id, name, email, notes) VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, name, email ?? null, notes ?? null]
  );
  return result.rows[0];
}

/**
 * List all contacts for a specific user.
 */
export async function listContacts(userId: string): Promise<Contact[]> {
  const result = await pgPool.query<Contact>(
    `SELECT * FROM contacts WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Get a single contact by ID, scoped to user.
 */
export async function getContact(id: string, userId: string): Promise<Contact | null> {
  const result = await pgPool.query<Contact>(
    `SELECT * FROM contacts WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return result.rows[0] ?? null;
}

/**
 * Delete a contact owned by a user. Returns true if deleted.
 */
export async function deleteContact(id: string, userId: string): Promise<boolean> {
  const result = await pgPool.query(
    `DELETE FROM contacts WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}
