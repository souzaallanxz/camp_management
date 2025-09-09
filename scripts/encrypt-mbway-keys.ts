import { neon } from '@neondatabase/serverless'
import crypto from 'crypto'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Initialize Neon database connection
const sql = neon(process.env.DATABASE_URL!)

// Encryption functions (same as server.ts)
function encrypt(text: string): string {
  const algorithm = 'aes-256-cbc'
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key-change-in-production', 'salt', 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

function decrypt(encryptedText: string): string {
  const algorithm = 'aes-256-cbc'
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key-change-in-production', 'salt', 32)
  const textParts = encryptedText.split(':')
  const iv = Buffer.from(textParts.shift()!, 'hex')
  const encryptedData = textParts.join(':')
  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

async function encryptExistingKeys() {
  try {
    console.log('🔐 Starting MBWay keys encryption...')

    // Check if ENCRYPTION_KEY is set
    if (!process.env.ENCRYPTION_KEY) {
      console.error('❌ ENCRYPTION_KEY environment variable is not set!')
      console.log('💡 Please set ENCRYPTION_KEY in your environment variables')
      process.exit(1)
    }

    // Get all existing MBWay integrations
    const integrations = await sql`
      SELECT id, mbway_key, team_id 
      FROM mbway_integrations 
      WHERE mbway_key IS NOT NULL AND mbway_key != ''
    `

    console.log(`📊 Found ${integrations.length} MBWay integrations to encrypt`)

    if (integrations.length === 0) {
      console.log('✅ No integrations found to encrypt')
      return
    }

    let encryptedCount = 0
    let skippedCount = 0

    for (const integration of integrations) {
      try {
        // Check if the key is already encrypted (contains ':')
        if (integration.mbway_key.includes(':')) {
          console.log(`⏭️  Skipping already encrypted key for team ${integration.team_id}`)
          skippedCount++
          continue
        }

        // Encrypt the key
        const encryptedKey = encrypt(integration.mbway_key)

        // Update the database
        await sql`
          UPDATE mbway_integrations 
          SET mbway_key = ${encryptedKey}, updated_at = NOW()
          WHERE id = ${integration.id}::uuid
        `

        console.log(`✅ Encrypted key for team ${integration.team_id}`)
        encryptedCount++

      } catch (error) {
        console.error(`❌ Error encrypting key for team ${integration.team_id}:`, error)
      }
    }

    console.log('\n📈 Encryption Summary:')
    console.log(`✅ Successfully encrypted: ${encryptedCount} keys`)
    console.log(`⏭️  Skipped (already encrypted): ${skippedCount} keys`)
    console.log(`📊 Total processed: ${integrations.length} integrations`)

  } catch (error) {
    console.error('❌ Error during encryption process:', error)
    process.exit(1)
  }
}

// Run the encryption
encryptExistingKeys()
  .then(() => {
    console.log('\n🎉 MBWay keys encryption completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Encryption failed:', error)
    process.exit(1)
  }) 