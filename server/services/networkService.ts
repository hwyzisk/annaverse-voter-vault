import { storage } from '../storage';
import type { UserNetwork, InsertUserNetwork, UpdateUserNetwork, Contact } from '@shared/schema';

class NetworkService {
  // Get user's network with contact details
  async getUserNetworks(userId: string): Promise<(UserNetwork & { contact: Contact })[]> {
    return await storage.getUserNetworks(userId);
  }

  // Check if a contact is in user's network
  async isContactInNetwork(userId: string, contactId: string): Promise<boolean> {
    const network = await storage.getUserNetwork(userId, contactId);
    return !!network;
  }

  // Add contact to user's network
  async addToNetwork(userId: string, contactId: string, notes?: string): Promise<UserNetwork> {
    // Check if contact already exists in network
    const existingNetwork = await storage.getUserNetwork(userId, contactId);
    if (existingNetwork) {
      throw new Error('Contact already exists in your network');
    }

    const networkData: InsertUserNetwork = {
      userId,
      contactId,
      notes: notes || null
    };

    return await storage.addToUserNetwork(networkData);
  }

  // Update network entry (primarily for notes)
  async updateNetworkEntry(userId: string, networkId: string, updates: UpdateUserNetwork): Promise<UserNetwork> {
    // Verify the network belongs to the current user
    const network = await storage.getNetworkById(networkId);
    if (!network) {
      throw new Error('Network entry not found');
    }
    if (network.userId !== userId) {
      throw new Error('Access denied - not your network entry');
    }

    return await storage.updateUserNetwork(networkId, updates);
  }

  // Remove contact from user's network
  async removeFromNetwork(userId: string, networkId: string): Promise<void> {
    // Verify the network belongs to the current user
    const network = await storage.getNetworkById(networkId);
    if (!network) {
      throw new Error('Network entry not found');
    }
    if (network.userId !== userId) {
      throw new Error('Access denied - not your network entry');
    }

    await storage.removeFromUserNetwork(networkId);
  }

  // Get network status for a specific contact
  async getNetworkStatus(userId: string, contactId: string): Promise<{ inNetwork: boolean; networkId?: string; notes?: string }> {
    const network = await storage.getUserNetwork(userId, contactId);
    return {
      inNetwork: !!network,
      networkId: network?.id,
      notes: network?.notes || undefined
    };
  }

  // Get network statistics for a user
  async getNetworkStats(userId: string): Promise<{ totalContacts: number; recentlyAdded: number }> {
    const networks = await storage.getUserNetworks(userId);

    // Count recently added (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentlyAdded = networks.filter(network =>
      network.createdAt && network.createdAt >= sevenDaysAgo
    ).length;

    return {
      totalContacts: networks.length,
      recentlyAdded
    };
  }
}

export const networkService = new NetworkService();