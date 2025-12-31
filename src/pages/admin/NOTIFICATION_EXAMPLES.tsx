/**
 * Example: AdminOrdersV2 Integration with Toast & Confirm Modal
 * Demonstrates how to use the new V3 notification system
 */

import React, { useState } from 'react';
import { Trash2, Edit } from 'lucide-react';
import { useAdminToast } from './components/ui/AdminToast';
import { useAdminConfirm } from './components/ui/AdminConfirmModal';
import { AdminButton } from './components/ui/AdminButton';

/**
 * Example 1: Using Toast Notifications
 */
export const OrderActionsExample = () => {
  const toast = useAdminToast();

  const handleOrderStatusChange = async (orderId: string, newStatus: string) => {
    try {
      // API call here
      // await adminService.updateOrderStatus(orderId, newStatus);
      
      // Show success toast
      toast.success('Order status updated successfully');
      
      // OR with title
      toast.success('Order #' + orderId + ' updated to ' + newStatus, 'Status Updated');
      
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const handleNewOrder = () => {
    // Show info toast with action
    toast.showToast({
      type: 'info',
      title: 'New Order Received',
      message: 'Order #12345 from John Doe - Rp 500.000',
      action: {
        label: 'View Order',
        onClick: () => {
          // Navigate to order detail
          console.log('Navigate to order');
        }
      }
    });
  };

  const handleExport = () => {
    toast.warning('Export feature coming soon', 'Under Development');
  };

  return null;
};

/**
 * Example 2: Using Confirmation Modal
 */
export const OrderDeleteExample = () => {
  const toast = useAdminToast();
  const { showConfirm, ConfirmModal } = useAdminConfirm();

  const handleDeleteOrder = async (orderId: string) => {
    // Show confirmation modal
    const confirmed = await showConfirm({
      title: 'Delete Order',
      message: 'Are you sure you want to delete this order? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete Order',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      try {
        // API call here
        // await adminService.deleteOrder(orderId);
        
        toast.success('Order deleted successfully');
      } catch (error) {
        toast.error('Failed to delete order');
      }
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const confirmed = await showConfirm({
      title: 'Cancel Order',
      message: 'Do you want to cancel this order?',
      type: 'warning',
      confirmText: 'Cancel Order',
      cancelText: 'Keep Order'
    });

    if (confirmed) {
      toast.success('Order cancelled');
    }
  };

  return (
    <>
      <AdminButton onClick={() => handleDeleteOrder('123')} variant="danger">
        <Trash2 className="w-4 h-4" />
        Delete
      </AdminButton>
      
      {/* IMPORTANT: Include the ConfirmModal component */}
      <ConfirmModal />
    </>
  );
};

/**
 * Example 3: Complete Order Management with Both Features
 */
export const CompleteOrderManagementExample = () => {
  const toast = useAdminToast();
  const { showConfirm, ConfirmModal } = useAdminConfirm();
  const [loading, setLoading] = useState(false);

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    const confirmed = await showConfirm({
      title: 'Update Order Status',
      message: `Change order status to ${status}?`,
      type: 'info',
      confirmText: 'Update',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      setLoading(true);
      try {
        // API call
        // await adminService.updateOrderStatus(orderId, status);
        
        toast.success(`Order status updated to ${status}`, 'Success');
        
        // Optional: Show toast with action
        toast.showToast({
          type: 'success',
          title: 'Order Updated',
          message: 'Would you like to notify the customer?',
          action: {
            label: 'Send Notification',
            onClick: async () => {
              // Send notification
              toast.info('Notification sent to customer');
            }
          },
          duration: 7000 // 7 seconds
        });
        
      } catch (error) {
        toast.error('Failed to update order status', 'Error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBulkDelete = async (orderIds: string[]) => {
    const confirmed = await showConfirm({
      title: 'Delete Multiple Orders',
      message: `Are you sure you want to delete ${orderIds.length} orders? This action cannot be undone.`,
      type: 'danger',
      confirmText: `Delete ${orderIds.length} Orders`,
      cancelText: 'Cancel'
    });

    if (confirmed) {
      setLoading(true);
      try {
        // API call
        // await adminService.bulkDeleteOrders(orderIds);
        
        toast.success(`Successfully deleted ${orderIds.length} orders`);
        
      } catch (error) {
        toast.error('Failed to delete orders');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white">Order Management</h2>
      
      <div className="flex gap-3">
        <AdminButton onClick={() => handleUpdateOrderStatus('123', 'completed')}>
          Mark as Completed
        </AdminButton>
        
        <AdminButton 
          onClick={() => handleBulkDelete(['1', '2', '3'])} 
          variant="danger"
        >
          Delete Selected
        </AdminButton>
      </div>
      
      {/* IMPORTANT: Include the ConfirmModal */}
      <ConfirmModal />
    </div>
  );
};

/**
 * Usage Guide:
 * 
 * 1. Toast Notifications (Floating):
 *    - Import: import { useAdminToast } from './components/ui/AdminToast';
 *    - Hook: const toast = useAdminToast();
 *    - Success: toast.success('message', 'optional title');
 *    - Error: toast.error('message', 'optional title');
 *    - Warning: toast.warning('message', 'optional title');
 *    - Info: toast.info('message', 'optional title');
 *    - With Action: toast.showToast({ type, message, action: { label, onClick } });
 * 
 * 2. Confirmation Modal:
 *    - Import: import { useAdminConfirm } from './components/ui/AdminConfirmModal';
 *    - Hook: const { showConfirm, ConfirmModal } = useAdminConfirm();
 *    - Usage: const confirmed = await showConfirm({ title, message, type });
 *    - Types: 'danger', 'warning', 'info', 'success'
 *    - IMPORTANT: Add <ConfirmModal /> to your JSX
 * 
 * 3. AdminShell automatically wraps everything with AdminToastProvider
 *    No need to add provider manually if using AdminShell
 */
