#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const ptFile = path.join(__dirname, '../src/i18n/locales/pt.json')
const enFile = path.join(__dirname, '../src/i18n/locales/en.json')
const publicPtFile = path.join(__dirname, '../public/locales/pt/translation.json')
const publicEnFile = path.join(__dirname, '../public/locales/en/translation.json')

function addTranslation(key, ptValue, enValue) {
  try {
    // Read existing files
    const ptData = JSON.parse(fs.readFileSync(ptFile, 'utf8'))
    const enData = JSON.parse(fs.readFileSync(enFile, 'utf8'))

    // Split key by dots to create nested structure
    const keys = key.split('.')
    let ptCurrent = ptData
    let enCurrent = enData

    // Navigate to the parent object
    for (let i = 0; i < keys.length - 1; i++) {
      if (!ptCurrent[keys[i]]) {
        ptCurrent[keys[i]] = {}
      }
      if (!enCurrent[keys[i]]) {
        enCurrent[keys[i]] = {}
      }
      ptCurrent = ptCurrent[keys[i]]
      enCurrent = enCurrent[keys[i]]
    }

    // Add the translation
    const finalKey = keys[keys.length - 1]
    ptCurrent[finalKey] = ptValue
    enCurrent[finalKey] = enValue

    // Write back to files
    fs.writeFileSync(ptFile, JSON.stringify(ptData, null, 2))
    fs.writeFileSync(enFile, JSON.stringify(enData, null, 2))
    fs.writeFileSync(publicPtFile, JSON.stringify(ptData, null, 2))
    fs.writeFileSync(publicEnFile, JSON.stringify(enData, null, 2))

    console.log(`✅ Translation added successfully!`)
    console.log(`Key: ${key}`)
    console.log(`PT: ${ptValue}`)
    console.log(`EN: ${enValue}`)
  } catch (error) {
    console.error('❌ Error adding translation:', error.message)
  }
}

// Get command line arguments
const args = process.argv.slice(2)

if (args.length !== 3) {
  console.log('Usage: node scripts/add-translation.js <key> <portuguese_value> <english_value>')
  console.log('Example: node scripts/add-translation.js "common.welcome" "Bem-vindo" "Welcome"')
  process.exit(1)
}

const [key, ptValue, enValue] = args

addTranslation(key, ptValue, enValue) 