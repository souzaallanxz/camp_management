import { db } from '@/lib/db'
import type { SnackBarTransaction } from '../data/schema'

export async function getCampCampers(campId: string) {
  const { data, error } = await db.query(
    `SELECT c.id, c.name, c.registration_id, r.snack_bar_balance
     FROM campers c
     JOIN registrations r ON c.registration_id = r.id
     WHERE r.camp_id = $1
     ORDER BY c.name`,
    [campId]
  )

  if (error) {
    throw new Error(`Error fetching campers: ${error.message}`)
  }

  return data || []
}

export async function getCampTransactions(campId: string) {
  const { data, error } = await db.query(
    `SELECT t.*, c.id as camper_id, c.name as camper_name, r.registration_number
     FROM snack_bar_transactions t
     JOIN campers c ON t.camper_id = c.id
     JOIN registrations r ON c.registration_id = r.id
     WHERE r.camp_id = $1
     ORDER BY t.created_at DESC`,
    [campId]
  )

  if (error) {
    throw new Error(`Error fetching transactions: ${error.message}`)
  }

  return data || []
}

export async function createTransaction(transaction: Omit<SnackBarTransaction, 'id' | 'created_at'>) {
  // Start a transaction
  const { error: beginError } = await db.query('BEGIN')
  if (beginError) {
    throw new Error(`Error starting transaction: ${beginError.message}`)
  }

  try {
    // Create the transaction
    const { data, error } = await db.query(
      `INSERT INTO snack_bar_transactions (
        camper_id,
        amount,
        type,
        description,
        created_at
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        transaction.camper_id,
        transaction.amount,
        transaction.type,
        transaction.description,
        new Date().toISOString()
      ]
    )

    if (error) {
      throw new Error(`Error creating transaction: ${error.message}`)
    }

    // Update the camper's snack bar balance
    const balanceChange = transaction.type === 'credit' ? transaction.amount : -transaction.amount
    const { error: updateError } = await db.query(
      `UPDATE registrations r
       SET snack_bar_balance = COALESCE(snack_bar_balance, 0) + $1
       FROM campers c
       WHERE r.id = c.registration_id AND c.id = $2`,
      [balanceChange, transaction.camper_id]
    )

    if (updateError) {
      throw new Error(`Error updating snack bar balance: ${updateError.message}`)
    }

    // Commit the transaction
    const { error: commitError } = await db.query('COMMIT')
    if (commitError) {
      throw new Error(`Error committing transaction: ${commitError.message}`)
    }

    return data[0]
  } catch (error) {
    // Rollback the transaction on error
    await db.query('ROLLBACK')
    throw error
  }
}

export async function deleteTransaction(id: string) {
  // Start a transaction
  const { error: beginError } = await db.query('BEGIN')
  if (beginError) {
    throw new Error(`Error starting transaction: ${beginError.message}`)
  }

  try {
    // Get the transaction details before deleting
    const { data: transaction, error: getError } = await db.query(
      'SELECT camper_id, amount, type FROM snack_bar_transactions WHERE id = $1',
      [id]
    )

    if (getError) {
      throw new Error(`Error getting transaction: ${getError.message}`)
    }

    if (!transaction || transaction.length === 0) {
      throw new Error('Transaction not found')
    }

    // Delete the transaction
    const { error: deleteError } = await db.query(
      'DELETE FROM snack_bar_transactions WHERE id = $1',
      [id]
    )

    if (deleteError) {
      throw new Error(`Error deleting transaction: ${deleteError.message}`)
    }

    // Reverse the balance change
    const balanceChange = transaction[0].type === 'credit' ? -transaction[0].amount : transaction[0].amount
    const { error: updateError } = await db.query(
      `UPDATE registrations r
       SET snack_bar_balance = COALESCE(snack_bar_balance, 0) + $1
       FROM campers c
       WHERE r.id = c.registration_id AND c.id = $2`,
      [balanceChange, transaction[0].camper_id]
    )

    if (updateError) {
      throw new Error(`Error updating snack bar balance: ${updateError.message}`)
    }

    // Commit the transaction
    const { error: commitError } = await db.query('COMMIT')
    if (commitError) {
      throw new Error(`Error committing transaction: ${commitError.message}`)
    }
  } catch (error) {
    // Rollback the transaction on error
    await db.query('ROLLBACK')
    throw error
  }
}

export const snackbarService = {
  getCampCampers,
  getCampTransactions,
  createTransaction,
  deleteTransaction
} 