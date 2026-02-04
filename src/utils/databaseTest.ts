import { supabase } from '../services/supabase';

// Test database connectivity and schema
export const testDatabaseConnection = async () => {
  
  if (!supabase) {
    console.error('❌ Supabase client not initialized');
    return false;
  }
  
  try {
    // Test basic connection
    const { data: _data, error } = await supabase.from('products').select('count').limit(1);
    if (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }

    // Test schema capabilities
    
    // Check if tiers table exists
    try {
      const { data: _tiersData, error: tiersError } = await supabase.from('tiers').select('id').limit(1);
      if (tiersError) {
        console.warn('⚠️ Tiers table issue:', tiersError.message);
      } else {
      }
    } catch (e) {
      console.warn('⚠️ Tiers table not accessible');
    }

    // Check if game_titles table exists
    try {
      const { data: _gamesData, error: gamesError } = await supabase.from('game_titles').select('id').limit(1);
      if (gamesError) {
        console.warn('⚠️ Game titles table issue:', gamesError.message);
      } else {
      }
    } catch (e) {
      console.warn('⚠️ Game titles table not accessible');
    }

    // Check products table structure
    try {
      const { data: _productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, price, game_title_id, tier_id')
        .limit(1);
      
      if (productsError) {
        console.warn('⚠️ Products relational query failed:', productsError.message);
        
        // Try basic products query
        const { data: _basicData, error: basicError } = await supabase
          .from('products')
          .select('id, name, price')
          .limit(1);
          
        if (basicError) {
          console.error('❌ Products table not accessible:', basicError.message);
        } else {
                  }
      } else {
              }
    } catch (e) {
      console.error('❌ Products table test failed:', e);
    }

    return true;
  } catch (error) {
    console.error('💥 Database test failed:', error);
    return false;
  }
};

// Test product creation with minimal data
export const testProductCreation = async () => {
  
  if (!supabase) {
    console.error('❌ Supabase client not initialized');
    return null;
  }
  
  try {
    const testProduct = {
      name: 'Test Product ' + Date.now(),
      description: 'Test description',
      price: 10000,
      original_price: null,
      image: '',
      images: [],
      category_id: 'test-cat-id', // requires existing category id in real DB; adjust if needed
      is_flash_sale: false,
      has_rental: false,
      stock: 1,
      game_title_id: null,
      tier_id: null
    };

    const { data, error } = await supabase
      .from('products')
      .insert([testProduct])
      .select()
      .single();

    if (error) {
      console.error('❌ Test product creation failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return null;
    }
    
    // Clean up test product
    await supabase.from('products').delete().eq('id', data.id);
    
    return data;
  } catch (error) {
    console.error('💥 Product creation test failed:', error);
    return null;
  }
};
