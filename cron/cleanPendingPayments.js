import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function clean() {
  console.log('🔍 Atualizando pagamentos pendentes em `payments` e `snackbar_balance`');

  const queries = [
    {
      table: 'payments',
      sql: `
        UPDATE payments
        SET payment_status = 'expired'
        WHERE payment_status = 'not confirmed'
        AND created_at < NOW() - INTERVAL '20 minutes';
      `
    },
    {
      table: 'snackbar_balance',
      sql: `
        UPDATE snackbar_balance
        SET payment_status = 'expired'
        WHERE payment_status = 'not confirmed'
        AND created_at < NOW() - INTERVAL '20 minutes';
      `
    }
  ];

  for (const { table, sql } of queries) {
    try {
      const result = await pool.query(sql);
      console.log(`✅ ${result.rowCount} registos atualizados em ${table}`);
    } catch (err) {
      console.error(`❌ Erro ao atualizar ${table}:`, err);
    }
  }

  await pool.end();
}

clean();
