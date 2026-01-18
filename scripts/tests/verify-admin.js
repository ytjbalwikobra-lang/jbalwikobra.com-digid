#!/usr/bin/env node
/*
  Verify admin CRUD flows against Supabase using anon key and current RLS.
  Steps:
  1) Create test product (with required fields like category)
  2) Update the product
  3) Insert rental options
  4) Read back product and rentals
  5) Cleanup rentals and product
*/

const { createClient } = require('@supabase/supabase-js')

function requiredEnv(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`[verify-admin] Missing env ${name}. Make sure to export REACT_APP_SUPABASE_* variables.`)
    process.exit(2)
  }
  return v
}

async function main() {
  const url = requiredEnv('REACT_APP_SUPABASE_URL')
  const anon = requiredEnv('REACT_APP_SUPABASE_ANON_KEY')
  const supabase = createClient(url, anon)

  const log = (...args) => console.log('[verify-admin]', ...args)

  try {
    log('Checking connectivity...')
    const { error: pingErr } = await supabase.from('products').select('id').limit(1)
    if (pingErr) throw pingErr
    log('Connectivity OK')

    // 1) Create product
    const testName = `Auto Test Product ${Date.now()}`
    const createPayload = {
      name: testName,
      description: 'Automated verification product',
      price: 12345,
      original_price: null,
      image: '',
      images: [],
      category: 'test',
  // Fallback for legacy schemas where products.game_title (text) is NOT NULL
  game_title: 'Verification Game',
      account_level: null,
      account_details: null,
      is_flash_sale: false,
      has_rental: true,
      stock: 1,
      game_title_id: null,
      tier_id: null,
    }

    log('Creating product...')
    let { data: created, error: createErr } = await supabase.from('products').insert([createPayload]).select().single()
    if (createErr) throw createErr
    log('Created product id:', created.id)

    // 2) Update product
    log('Updating product name...')
    const { data: updated, error: updErr } = await supabase
      .from('products')
      .update({ name: `${testName} (updated)` })
      .eq('id', created.id)
      .select()
      .single()
    if (updErr) throw updErr
    log('Updated name OK')

    // 3) Insert rentals
    log('Inserting rental options...')
    const rentals = [
      { product_id: created.id, duration: '1 Hari', price: 5000, description: 'Test 1 day' },
      { product_id: created.id, duration: '3 Hari', price: 12000, description: 'Test 3 days' },
    ]
    const { error: rentErr } = await supabase.from('rental_options').insert(rentals)
    if (rentErr) throw rentErr
    log('Inserted rentals OK')

    // 4) Read back
    log('Reading back product and rentals...')
    const { data: prod, error: prodErr } = await supabase.from('products').select('*').eq('id', created.id).single()
    if (prodErr) throw prodErr
    const { data: ro, error: roErr } = await supabase.from('rental_options').select('*').eq('product_id', created.id)
    if (roErr) throw roErr
    log('Read back OK. Rentals:', ro.length)

    // 5) Cleanup
    log('Cleaning up (delete rentals, then product)...')
    await supabase.from('rental_options').delete().eq('product_id', created.id)
    await supabase.from('products').delete().eq('id', created.id)
    log('Cleanup done. ✅ All checks passed')
  } catch (e) {
    console.error('[verify-admin] FAILED:', {
      message: e?.message,
      code: e?.code,
      details: e?.details,
      hint: e?.hint,
    })
    process.exit(1)
  }
}

main()
