import { supabase } from '../services/supabase';

// Fix RLS policies directly through the client
export const fixRLSPolicies = async (): Promise<{ success: boolean; message: string }> => {
  if (!supabase) {
    return { success: false, message: 'Supabase client not initialized' };
  }

  try {
    // The RLS policies need to be fixed at the database level
    // For now, let's try a different approach - using the service_role key if available
    // or temporarily disable RLS for testing

    // First, let's try to create a test product to see the exact error
    const testResult = await testProductCreationWithDetails();
    
    if (testResult.success) {
      return { success: true, message: 'RLS policies are working correctly' };
    }

    // If we get here, RLS is blocking us
    console.warn('⚠️ RLS is blocking product creation. This requires database admin access to fix.');
    
    return { 
      success: false, 
      message: 'RLS policies need to be updated by database administrator. The policies are too restrictive for admin operations.' 
    };

  } catch (error) {
    console.error('💥 RLS fix failed:', error);
    return { success: false, message: `RLS fix failed: ${error}` };
  }
};

const testProductCreationWithDetails = async (): Promise<{ success: boolean; error?: any }> => {
  if (!supabase) {
    return { success: false, error: 'No supabase client' };
  }

  try {
    const testProduct = {
      name: `RLS Test Product ${Date.now()}`,
      description: 'Testing RLS policies',
      price: 10000,
      original_price: null,
      image: '',
      images: [],
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
      console.error('❌ Detailed RLS error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        status: (error as any).status,
        statusText: (error as any).statusText
      });
      return { success: false, error };
    }

    // Clean up if successful
    if (data?.id) {
      await supabase.from('products').delete().eq('id', data.id);
    }

    return { success: true };

  } catch (error) {
    return { success: false, error };
  }
};

// Alternative approach - use a service role key for admin operations
export const createProductWithAdminAccess = async (_productData: any): Promise<any> => {
  // This would require a service role key to bypass RLS
  // For now, we'll document this as a requirement
  
  console.warn('⚠️ Admin product creation requires service role access or RLS policy updates');
  
  return null;
};
