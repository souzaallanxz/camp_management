/**
 * Lemon Squeezy Setup Script
 * Run this script to discover your store and product IDs
 * 
 * Usage: npx tsx src/scripts/lemon-squeezy-setup.ts
 */

/* eslint-disable no-console */

import { getStores, getProducts, getVariants } from '../services/lemon-squeezy.service';

// Basic types for this script
interface StoreData {
  id: string;
  attributes: {
    name: string;
  };
}

interface ProductData {
  id: string;
  attributes: {
    name: string;
    price: number;
    price_formatted: string;
  };
}

interface VariantData {
  id: string;
  attributes: {
    name: string;
    price: number;
    price_formatted: string;
    price_currency: string;
    interval?: string;
  };
}

async function discoverLemonSqueezyIds() {
  try {
    console.log('🍋 Descobrindo IDs do Lemon Squeezy...\n');

    // Get stores
    console.log('📊 Buscando lojas...');
    const storesResponse = await getStores();
    
    const stores = storesResponse.data as StoreData[];
    if (!stores || stores.length === 0) {
      console.log('❌ Nenhuma loja encontrada. Verifique se você criou uma loja no Lemon Squeezy.');
      return;
    }

    console.log('✅ Lojas encontradas:');
    stores.forEach((store) => {
      console.log(`   - ID: ${store.id}, Nome: ${store.attributes.name}`);
    });

    // Use the first store
    const storeId = stores[0].id;
    console.log(`\n🏪 Usando loja: ${stores[0].attributes.name} (ID: ${storeId})`);

    // Get products for the store
    console.log('\n📦 Buscando produtos...');
    const productsResponse = await getProducts(storeId);
    
    const products = productsResponse.data as ProductData[];
    if (!products || products.length === 0) {
      console.log('❌ Nenhum produto encontrado. Crie um produto para o plano Premium no Lemon Squeezy.');
      return;
    }

    console.log('✅ Produtos encontrados:');
    products.forEach((product) => {
      console.log(`   - ID: ${product.id}, Nome: ${product.attributes.name}`);
      console.log(`     Preço: ${product.attributes.price} ${product.attributes.price_formatted}`);
    });

    // Get variants for each product
    for (const product of products) {
      console.log(`\n🔧 Buscando variantes para produto: ${product.attributes.name}`);
      const variantsResponse = await getVariants(product.id);
      
      const variants = variantsResponse.data as VariantData[];
      if (variants && variants.length > 0) {
        console.log('✅ Variantes encontradas:');
        variants.forEach((variant) => {
          console.log(`   - ID: ${variant.id}, Nome: ${variant.attributes.name}`);
          console.log(`     Preço: ${variant.attributes.price} ${variant.attributes.price_formatted}`);
        });
      }
    }

    console.log('\n🎯 CONFIGURAÇÃO NECESSÁRIA:');
    console.log('═'.repeat(50));
    console.log(`Store ID: ${storeId}`);
    
    if (products.length > 0) {
      // Look for a premium/paid product or just use the first one
      const premiumProduct = products.find((p) => 
        p.attributes.name.toLowerCase().includes('premium') ||
        p.attributes.name.toLowerCase().includes('pro') ||
        p.attributes.price > 0
      ) || products[0];
      
      console.log(`Produto Premium: ${premiumProduct.attributes.name} (ID: ${premiumProduct.id})`);
      
      // Get variants for the premium product
      const variantsResponse = await getVariants(premiumProduct.id);
      const variants = variantsResponse.data as VariantData[];
      if (variants && variants.length > 0) {
        const monthlyVariant = variants.find((v) =>
          v.attributes.name.toLowerCase().includes('month') ||
          v.attributes.interval === 'month'
        ) || variants[0];
        
        console.log(`Variant ID: ${monthlyVariant.id}`);
        
        console.log('\n📝 Atualize o arquivo lemon-squeezy.service.ts:');
        console.log(`export const PREMIUM_PLAN = {`);
        console.log(`  storeId: '${storeId}',`);
        console.log(`  variantId: '${monthlyVariant.id}',`);
        console.log(`  price: ${monthlyVariant.attributes.price / 100},`);
        console.log(`  currency: '${monthlyVariant.attributes.price_currency}',`);
        console.log(`  interval: 'month',`);
        console.log(`};`);
      }
    }

  } catch (error) {
    console.error('❌ Erro ao descobrir IDs:', error);
    
    if (error instanceof Error && error.message.includes('401')) {
      console.error('\n🔑 Erro de autenticação. Verifique se a API key está correta.');
    } else if (error instanceof Error && error.message.includes('404')) {
      console.error('\n📭 Recurso não encontrado. Verifique se você tem produtos criados no Lemon Squeezy.');
    }
  }
}

// Run the script
discoverLemonSqueezyIds().catch(console.error); 